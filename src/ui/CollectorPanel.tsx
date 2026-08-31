import { useEffect, useMemo, useRef, useState } from 'react';
import { readCurrentTerm } from '../api/client';
import { cancelCapture, runCapture } from '../collector/capture';
import type { CaptureJob } from '../contracts/model';
import { buildSourcePackage, downloadSourcePackage } from '../export/sourcePackage';
import { captureStorage } from '../storage/client';

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60 ? `约 ${minutes} 分钟` : `约 ${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

export function CollectorPanel() {
  const [job, setJob] = useState<CaptureJob | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    void captureStorage.getSnapshot().then(async (snapshot) => {
      if (snapshot.job?.lifecycle === 'running') {
        const paused = { ...snapshot.job, lifecycle: 'paused' as const, progress: { ...snapshot.job.progress, current: null } };
        await captureStorage.putJob(paused);
        setJob(paused);
      } else {
        setJob(snapshot.job);
      }
    });
    return () => controller.current?.abort();
  }, []);

  const remaining = useMemo(() => {
    if (!job || job.progress.completed === 0) return '—';
    const elapsed = (Date.now() - new Date(job.observed_at).getTime()) / 1000;
    return formatDuration((elapsed / job.progress.completed) * (job.progress.total - job.progress.completed));
  }, [job]);

  const start = async () => {
    setMessage(null);
    setConfirmClear(false);
    try {
      const term = readCurrentTerm();
      controller.current?.abort();
      controller.current = new AbortController();
      const completed = await runCapture(term, controller.current.signal, setJob);
      if (completed.lifecycle === 'complete') setMessage('采集完成，可以导出数据包。');
      else if (completed.last_error) setMessage(completed.last_error);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const pause = () => {
    controller.current?.abort();
    controller.current = null;
  };

  const cancel = async () => {
    controller.current?.abort();
    controller.current = null;
    if (job) setJob(await cancelCapture(job));
  };

  const clear = async () => {
    controller.current?.abort();
    await captureStorage.clear();
    setJob(null);
    setMessage('本机采集进度已清除。');
    setConfirmClear(false);
  };

  const exportPackage = async () => {
    try {
      const snapshot = await captureStorage.getSnapshot();
      if (!snapshot.job) throw new Error('没有可导出的采集任务');
      const built = await buildSourcePackage(snapshot.job, snapshot.results);
      downloadSourcePackage(built.archive, built.manifest.source_id, snapshot.job.term.academic_year);
      setMessage(`数据包已生成：${built.manifest.source_id.slice(0, 12)}…`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  if (collapsed) {
    return (
      <button className="jwxt-launcher" type="button" onClick={() => setCollapsed(false)} aria-label="打开南邮教务助手">
        课表
      </button>
    );
  }

  const progress = job?.progress;
  const percent = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const isRunning = job?.lifecycle === 'running';
  const canExport = job?.lifecycle === 'complete' && job.progress.failed === 0;

  return (
    <section className="jwxt-panel" aria-label="南邮教务助手">
      <header className="jwxt-header">
        <div>
          <strong>南邮教务助手</strong>
          <span>全校班级课表采集</span>
        </div>
        <button type="button" onClick={() => setCollapsed(true)} aria-label="收起面板">−</button>
      </header>

      <div className="jwxt-body">
        {job ? (
          <>
            <div className="jwxt-term">{job.term.academic_year} 学年第 {job.term.term_number} 学期</div>
            <div className="jwxt-progress" aria-label={`已完成 ${percent}%`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="jwxt-count"><strong>{progress?.completed ?? 0}</strong> / {progress?.total ?? 0}</div>
            <dl className="jwxt-stats">
              <div><dt>成功</dt><dd>{progress?.success ?? 0}</dd></div>
              <div><dt>空课表</dt><dd>{progress?.empty ?? 0}</dd></div>
              <div><dt>特殊</dt><dd>{progress?.special ?? 0}</dd></div>
              <div><dt>失败</dt><dd className={progress?.failed ? 'is-error' : ''}>{progress?.failed ?? 0}</dd></div>
            </dl>
            <p className="jwxt-current">{progress?.current ? `正在读取 ${progress.current}` : `预计剩余 ${remaining}`}</p>
          </>
        ) : (
          <p className="jwxt-intro">读取当前学期目录，逐班保存课表。页面关闭后仍可继续。</p>
        )}

        {message && <p className="jwxt-message" role="status">{message}</p>}

        <div className="jwxt-actions">
          {isRunning ? (
            <button className="primary" type="button" onClick={pause}>暂停</button>
          ) : (
            <button className="primary" type="button" onClick={() => void start()}>
              {job ? (job.progress.failed ? '重试并继续' : '继续采集') : '开始采集'}
            </button>
          )}
          {job && job.lifecycle !== 'complete' && job.lifecycle !== 'cancelled' && (
            <button type="button" onClick={() => void cancel()}>取消</button>
          )}
          {canExport && <button className="primary" type="button" onClick={() => void exportPackage()}>导出数据包</button>}
        </div>

        {job && (
          <div className="jwxt-clear">
            {confirmClear ? (
              <div className="jwxt-confirm">
                <span>清除本机进度？</span>
                <button type="button" onClick={() => void clear()}>确认清除</button>
                <button type="button" onClick={() => setConfirmClear(false)}>返回</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)}>清除进度</button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
