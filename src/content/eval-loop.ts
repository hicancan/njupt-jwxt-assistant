import { parseEvalPage, getEvalDocument } from './dom-analyzer';
import { computeFillActions } from './eval-strategy';
import { applyFillActions, clickSave, selectCourse, writeComment } from './dom-fill';
import { detectEffectivePageType } from './page-detector';

const LOOP_KEY = 'njupt-eval-loop';
const STATUS_KEY = 'njupt-eval-status'; // 'running' | 'done' | 'error'
const ERROR_KEY = 'njupt-eval-error';

interface LoopState {
  pageType: string;
  comment: string;
  currentIndex: number;
  totalCourses: number;
}

// ---- sessionStorage helpers ----
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

/** Returns the persistent eval status (survives page reloads) */
export function getEvalStatus(): string {
  return ssGet(STATUS_KEY) || 'idle';
}
export function getEvalError(): string {
  return ssGet(ERROR_KEY) || '';
}
export function clearEvalStatus(): void {
  ssRemove(STATUS_KEY);
  ssRemove(ERROR_KEY);
}

function setStatus(status: string, error?: string): void {
  ssSet(STATUS_KEY, status);
  if (error) ssSet(ERROR_KEY, error); else ssRemove(ERROR_KEY);
}

let _resuming = false;

/**
 * Auto-resume a pending eval loop. Called on every page/iframe load.
 * Returns true if a cycle was queued.
 */
export function maybeResumeEvalLoop(): boolean {
  if (_resuming) return false;

  const state = getLoopState();
  if (!state) return false;

  const currentType = detectEffectivePageType();
  if (currentType !== state.pageType) return false;

  const page = parseEvalPage(currentType);
  if (page.courses.length === 0) return false;

  if (state.currentIndex >= state.totalCourses) {
    clearLoopState();
    setStatus('done');
    return false;
  }

  setStatus('running');
  _resuming = true;
  setTimeout(async () => {
    try {
      await doOneEvalCycle(state);
    } catch (e) {
      clearLoopState();
      setStatus('error', e instanceof Error ? e.message : '评价出错');
    } finally {
      _resuming = false;
    }
  }, 500);
  return true;
}

async function doOneEvalCycle(state: LoopState): Promise<void> {
  const page = parseEvalPage(state.pageType as any);

  if (state.currentIndex >= page.courses.length) {
    clearLoopState();
    setStatus('done');
    return;
  }

  // Switch course via pjkc
  if (page.currentCourseIndex !== state.currentIndex) {
    selectCourse(state.currentIndex);
    await new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const doc = getEvalDocument();
        const pjkc = doc.getElementById('pjkc') as HTMLSelectElement | null;
        if (pjkc && pjkc.selectedIndex === state.currentIndex &&
            doc.querySelectorAll('select[id*="DataGrid1"]').length > 0) { resolve(); return; }
        if (Date.now() - start > 15000) { reject(new Error('页面切换超时')); return; }
        setTimeout(check, 300);
      };
      check();
    });
    const refreshed = parseEvalPage(state.pageType as any);
    Object.assign(page, refreshed);
  }

  // Fill
  const actions = computeFillActions(page.teacherGroups);
  applyFillActions(actions);
  if (page.hasCommentBox && page.commentBoxId) {
    writeComment(page.commentBoxId, state.comment);
  }

  // Advance index
  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= page.courses.length) {
    clearLoopState();
    setStatus('done');
  } else {
    setLoopState({ ...state, currentIndex: nextIndex });
  }

  // Save → triggers page/iframe reload
  if (page.saveButtonId) {
    clickSave(page.saveButtonId);
  } else {
    throw new Error('未找到保存按钮');
  }
}

export function startEvalLoop(comment: string): void {
  clearEvalStatus();
  const pageType = detectEffectivePageType();
  const page = parseEvalPage(pageType);

  if (page.courses.length === 0) {
    throw new Error('未检测到课程列表');
  }

  const state: LoopState = {
    pageType,
    comment,
    currentIndex: page.currentCourseIndex,
    totalCourses: page.courses.length,
  };

  setLoopState(state);
  setStatus('running');
  _resuming = true;
  doOneEvalCycle(state).catch((e) => {
    clearLoopState();
    setStatus('error', e instanceof Error ? e.message : '评价出错');
  }).finally(() => { _resuming = false; });
}
