import { useEffect, useCallback, useState, useRef } from 'react';
import { useEvalStore } from './store';
import { parseEvalPage } from './dom-analyzer';
import { detectEffectivePageType } from './page-detector';
import { startEvalLoop, maybeResumeEvalLoop, getLoopState, clearLoopState, getEvalStatus, getEvalError, clearEvalStatus } from './eval-loop';
import { ScheduleExporter } from '../schedule/ScheduleExporter';

const PAGE_LABELS: Record<string, string> = {
  satisfaction: '满意度调查',
  'teaching-eval': '教学评价',
  dashboard: '教务首页',
  schedule: '学生个人课表',
  unknown: '非评价页面',
};

// Persist UI state across page reloads
function loadUiState(): { collapsed: boolean; x: number; y: number } {
  try {
    const raw = sessionStorage.getItem('njupt-eval-ui');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { collapsed: false, x: 0, y: 0 };
}
function saveUiState(s: { collapsed: boolean; x: number; y: number }) {
  try { sessionStorage.setItem('njupt-eval-ui', JSON.stringify(s)); } catch {}
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600', running: 'bg-blue-100 text-blue-700',
    paused: 'bg-yellow-100 text-yellow-700', done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };
  const l: Record<string, string> = {
    idle: '就绪', running: '运行中', paused: '已暂停', done: '已完成', error: '出错',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m[status] || m.idle}`}>{l[status] || status}</span>;
}

export function EvalPanelApp() {
  const pageType = useEvalStore((s) => s.pageType);
  const evalPage = useEvalStore((s) => s.evalPage);
  const loopStatus = useEvalStore((s) => s.loopStatus);
  const currentCourseIndex = useEvalStore((s) => s.currentCourseIndex);
  const errorMessage = useEvalStore((s) => s.errorMessage);
  const settings = useEvalStore((s) => s.settings);
  const settingsHydrated = useEvalStore((s) => s.settingsHydrated);

  const initialUi = useRef(loadUiState());
  const [collapsed, setCollapsed] = useState(initialUi.current.collapsed);
  const [pos, setPos] = useState({ x: initialUi.current.x, y: initialUi.current.y });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Persist UI state
  const persistUi = useCallback((c: boolean, p: { x: number; y: number }) => {
    saveUiState({ collapsed: c, x: p.x, y: p.y });
  }, []);

  const refresh = useCallback(() => {
    const pt = detectEffectivePageType();
    useEvalStore.getState().setPageType(pt);

    // Sync loop state from sessionStorage (survives page reloads)
    const ls = getLoopState();
    const ssStatus = getEvalStatus();

    if (ls) {
      useEvalStore.getState().setLoopStatus('running');
      useEvalStore.getState().setCurrentCourseIndex(ls.currentIndex);
    } else if (ssStatus === 'done') {
      // Only show done on eval pages; clear stale status elsewhere
      useEvalStore.getState().setLoopStatus(
        (pt === 'satisfaction' || pt === 'teaching-eval') ? 'done' : 'idle'
      );
    } else if (ssStatus === 'error') {
      useEvalStore.getState().setLoopStatus('error');
      useEvalStore.getState().setErrorMessage(getEvalError());
    } else if (ssStatus !== 'running') {
      useEvalStore.getState().setLoopStatus('idle');
    }

    if (pt === 'satisfaction' || pt === 'teaching-eval') {
      useEvalStore.getState().setEvalPage(parseEvalPage(pt));
    }
  }, []);

  // Combined refresh: re-detect page + try to resume eval loop
  const refreshAndResume = useCallback(() => {
    refresh();
    if (maybeResumeEvalLoop()) {
      useEvalStore.getState().setLoopStatus('running');
    }
  }, [refresh]);

  useEffect(() => {
    useEvalStore.getState().hydrateSettings();
    refreshAndResume();

    // Polling for late iframe load + eval loop resume
    const timers: ReturnType<typeof setTimeout>[] = [];
    [800, 2000, 4000].forEach(ms => timers.push(setTimeout(refreshAndResume, ms)));

    // Watch iframes: load event = new eval page loaded = try to resume
    document.querySelectorAll('iframe').forEach(f => f.addEventListener('load', refreshAndResume));

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof HTMLIFrameElement) {
            node.addEventListener('load', refreshAndResume);
            timers.push(setTimeout(refreshAndResume, 1000));
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('hashchange', refreshAndResume);

    return () => {
      window.removeEventListener('hashchange', refreshAndResume);
      document.querySelectorAll('iframe').forEach(f => f.removeEventListener('load', refreshAndResume));
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [refreshAndResume]);

  const isEvalPage = pageType === 'satisfaction' || pageType === 'teaching-eval';
  const isRunning = loopStatus === 'running';
  const canStart = isEvalPage && evalPage && evalPage.courses.length > 0 && !isRunning;

  const handleStart = () => {
    try {
      useEvalStore.getState().reset();
      startEvalLoop(settings.comment);
      useEvalStore.getState().setLoopStatus('running');
      refresh();
    } catch (err) {
      useEvalStore.getState().setErrorMessage(err instanceof Error ? err.message : '启动失败');
    }
  };

  const handleStop = () => {
    clearLoopState();
    clearEvalStatus();
    useEvalStore.getState().setLoopStatus('idle');
  };

  const totalCourses = evalPage?.courses.length ?? 0;
  const activeIdx = isRunning ? currentCourseIndex : (evalPage?.currentCourseIndex ?? 0);
  const currentName = evalPage?.courses[activeIdx]?.name;
  const progress = totalCourses > 0 ? `${Math.min(activeIdx + 1, totalCourses)} / ${totalCourses}` : '-';

  // Drag
  const onMDown = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'BUTTON' || t.tagName === 'TEXTAREA' || t.closest('button') || t.closest('textarea')) return;
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const np = { x: dragStart.current.px + e.clientX - dragStart.current.x, y: dragStart.current.py + e.clientY - dragStart.current.y };
      setPos(np);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        persistUi(collapsed, pos);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [collapsed, pos, persistUi]);

  if (!settingsHydrated) return null;

  const pxStyle = (x: number, y: number) => ({
    top: y ? `${20 + Math.max(0, y)}px` : '16px',
    right: x ? `${20 - Math.min(0, x)}px` : '16px',
  });

  // Floating ball
  if (collapsed) {
    return (
      <div
        className="fixed z-[99999] pointer-events-auto cursor-pointer njupt-drag"
        style={{ ...pxStyle(pos.x, pos.y), top: pos.y ? `${20 + Math.max(0, pos.y)}px` : '20px' }}
        onMouseDown={onMDown}
        onClick={(e) => { if (!dragging.current) { setCollapsed(false); persistUi(false, pos); } }}
      >
        <div className="w-12 h-12 rounded-full bg-blue-600 shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
          <span className="text-white text-lg font-bold">助</span>
        </div>
        {isRunning && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white animate-pulse" />}
      </div>
    );
  }

  // Full panel
  return (
    <div className="njupt-eval-panel pointer-events-none">
      <div
        className="fixed z-[99999] w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-sans text-sm pointer-events-auto select-none"
        style={pxStyle(pos.x, pos.y)}
        onMouseDown={onMDown}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 cursor-move">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-base">NJUPT 教务助手</h2>
            <div className="flex items-center gap-2">
              <StatusBadge status={loopStatus} />
              <button className="text-white/70 hover:text-white text-xs leading-none" onClick={() => { setCollapsed(true); persistUi(true, pos); }}>—</button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-gray-500 text-xs">
            当前页面：<span className={`font-medium ${isEvalPage ? 'text-blue-600' : 'text-gray-400'}`}>{PAGE_LABELS[pageType] || pageType}</span>
          </div>

          {isEvalPage && evalPage && (
            <>
              <div className="text-gray-500 text-xs">课程进度：<span className="font-medium text-gray-700">{progress}</span></div>
              {currentName && <div className="text-gray-500 text-xs truncate">当前：<span className="font-medium text-gray-700">{currentName}</span></div>}
              <div className="text-gray-500 text-xs">教师组：<span className="font-medium text-gray-700">{evalPage.teacherGroups.length}</span></div>
            </>
          )}

          {isEvalPage && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">评语模板</label>
              <textarea className="w-full text-xs border border-gray-200 rounded p-2 resize-none focus:outline-none focus:border-blue-400" rows={2} maxLength={50} value={settings.comment}
                onChange={(e) => useEvalStore.getState().updateSettings({ comment: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()} />
            </div>
          )}

          {isEvalPage && <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">策略：每师随机1个次高分，其余最高分（自适应量表）</div>}

          {loopStatus === 'error' && errorMessage && <div className="text-xs text-red-600 bg-red-50 rounded p-2">{errorMessage}</div>}
          {loopStatus === 'done' && <div className="text-xs text-green-600 bg-green-50 rounded p-2">全部完成！请手动点击页面底部的【提交】。</div>}
          {isRunning && <div className="text-xs text-blue-600 bg-blue-50 rounded p-2 text-center">自动评教中，请勿操作...</div>}

          {isEvalPage && (
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!canStart} onClick={handleStart}>
                {pageType === 'satisfaction' ? '一键满意度' : '一键评价'}
              </button>
              {isRunning && <button className="py-2 px-3 rounded font-medium text-sm text-white bg-red-500 hover:bg-red-600 transition-colors" onClick={handleStop}>停止</button>}
            </div>
          )}

          {(loopStatus === 'done' || loopStatus === 'error') && (
            <button className="w-full py-1.5 rounded text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors" onClick={() => { clearLoopState(); clearEvalStatus(); useEvalStore.getState().reset(); }}>重置</button>
          )}

          {pageType === 'dashboard' && (
            <div className="space-y-2">
              <button className="w-full py-2 rounded font-medium text-sm text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                onClick={() => { const xh = new URLSearchParams(window.location.search).get('xh') || ''; window.location.href = `xs_jsmydpj.aspx?xh=${xh}&gnmkdm=N121801`; }}>前往满意度调查</button>
              <button className="w-full py-2 rounded font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                onClick={() => { const xh = new URLSearchParams(window.location.search).get('xh') || ''; window.location.href = `xsjxpj.aspx?xh=${xh}&gnmkdm=N12141`; }}>前往教学评价</button>
              <button className="w-full py-2 rounded font-medium text-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                onClick={() => { const xh = new URLSearchParams(window.location.search).get('xh') || ''; window.location.href = `xskbcx.aspx?xh=${xh}&gnmkdm=N121603`; }}>前往学生课表</button>
            </div>
          )}

          {pageType === 'schedule' && <ScheduleExporter />}

          {pageType === 'unknown' && <div className="text-xs text-gray-400 text-center">请导航至教务系统页面</div>}
        </div>
      </div>
    </div>
  );
}
