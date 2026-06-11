import { parseEvalPage, getEvalDocument } from './dom-analyzer';
import { computeFillActions } from './eval-strategy';
import { applyFillActions, clickSave, selectCourse, writeComment } from './dom-fill';
import { detectEffectivePageType } from './page-detector';
import type { PageType } from '../lib/types';

const LOOP_KEY = 'njupt-eval-loop';
const STATUS_KEY = 'njupt-eval-status';
const ERROR_KEY = 'njupt-eval-error';

interface LoopState {
  pageType: PageType;
  comment: string;
  currentIndex: number;
  totalCourses: number;
}

function ssGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, val: string): void {
  try { sessionStorage.setItem(key, val); } catch {}
}
function ssRemove(key: string): void {
  try { sessionStorage.removeItem(key); } catch {}
}

export function getLoopState(): LoopState | null {
  try { const raw = ssGet(LOOP_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function setLoopState(state: LoopState): void { ssSet(LOOP_KEY, JSON.stringify(state)); }
export function clearLoopState(): void { ssRemove(LOOP_KEY); }

export function getEvalStatus(): string { return ssGet(STATUS_KEY) || 'idle'; }
export function getEvalError(): string { return ssGet(ERROR_KEY) || ''; }
export function clearEvalStatus(): void { ssRemove(STATUS_KEY); ssRemove(ERROR_KEY); }

function setStatus(status: string, error?: string): void {
  ssSet(STATUS_KEY, status);
  if (error) ssSet(ERROR_KEY, error); else ssRemove(ERROR_KEY);
}

// --- Re-entrancy guard (module-level: content scripts are per-page singletons) ---
const guard = (() => {
  let running = false;
  return {
    acquire() { if (running) return false; running = true; return true; },
    release() { running = false; },
    isRunning() { return running; },
  };
})();

// --- Core loop ---

async function doOneEvalCycle(loopState: LoopState): Promise<void> {
  const currentPage = loopState.currentIndex !== loopState.totalCourses
    ? await ensureCourseSelected(loopState)
    : parseEvalPage(loopState.pageType);

  // Fill form
  const actions = computeFillActions(currentPage.teacherGroups);
  applyFillActions(actions);
  if (currentPage.hasCommentBox && currentPage.commentBoxId) {
    writeComment(currentPage.commentBoxId, loopState.comment);
  }

  // Advance index (check stop signal before writing)
  const nextIndex = loopState.currentIndex + 1;
  if (nextIndex >= currentPage.courses.length) {
    clearLoopState();
    setStatus('done');
  } else {
    if (!getLoopState()) return; // stopped by user
    setLoopState({ ...loopState, currentIndex: nextIndex });
  }

  // Save triggers page reload → maybeResume picks up next course
  if (currentPage.saveButtonId) {
    clickSave(currentPage.saveButtonId);
  } else {
    throw new Error('未找到保存按钮');
  }
}

/** Switch course via pjkc dropdown, wait for postback, return fresh page parse. */
async function ensureCourseSelected(loopState: LoopState): Promise<ReturnType<typeof parseEvalPage>> {
  const page = parseEvalPage(loopState.pageType);
  if (page.currentCourseIndex === loopState.currentIndex) return page;

  selectCourse(loopState.currentIndex);
  await new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const doc = getEvalDocument();
      const pjkc = doc.getElementById('pjkc') as HTMLSelectElement | null;
      if (pjkc && pjkc.selectedIndex === loopState.currentIndex &&
          doc.querySelectorAll('select[id*="DataGrid1"]').length > 0) { resolve(); return; }
      if (Date.now() - start > 15000) { reject(new Error('页面切换超时')); return; }
      setTimeout(check, 300);
    };
    check();
  });
  return parseEvalPage(loopState.pageType);
}

// --- Public API ---

/** Try to resume a pending eval loop. Called on every page/iframe load. */
export function maybeResumeEvalLoop(): boolean {
  if (!guard.acquire()) return false;

  const loopState = getLoopState();
  if (!loopState) { guard.release(); return false; }

  const currentType = detectEffectivePageType();
  if (currentType !== loopState.pageType) { guard.release(); return false; }

  const page = parseEvalPage(currentType);
  if (page.courses.length === 0) { guard.release(); return false; }

  if (loopState.currentIndex >= loopState.totalCourses) {
    clearLoopState();
    setStatus('done');
    guard.release();
    return false;
  }

  setStatus('running');
  setTimeout(async () => {
    try {
      await doOneEvalCycle(loopState);
    } catch (e) {
      clearLoopState();
      setStatus('error', e instanceof Error ? e.message : '评价出错');
    } finally {
      guard.release();
    }
  }, 500);
  return true;
}

export function startEvalLoop(comment: string): void {
  clearEvalStatus();

  const pageType = detectEffectivePageType();
  const page = parseEvalPage(pageType);
  if (page.courses.length === 0) throw new Error('未检测到课程列表');

  setLoopState({ pageType, comment, currentIndex: page.currentCourseIndex, totalCourses: page.courses.length });
  setStatus('running');

  if (guard.acquire()) {
    doOneEvalCycle(getLoopState()!).catch((e) => {
      clearLoopState();
      setStatus('error', e instanceof Error ? e.message : '评价出错');
    }).finally(() => guard.release());
  }
}
