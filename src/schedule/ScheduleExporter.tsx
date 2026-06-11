import { useState, useCallback, useEffect, useRef } from 'react';
import { parseScheduleData } from './parser';
import { generateICS } from './ics';
import { exportJSON, exportMarkdown } from './exporter';
import { getEvalDocument } from '../content/dom-analyzer';

/** Nth Monday of a given month (1-based). */
function nthMonday(year: number, month: number, n: number): Date {
  const first = new Date(year, month - 1, 1);
  const offset = first.getDay() <= 1 ? 1 - first.getDay() : 8 - first.getDay();
  return new Date(year, month - 1, 1 + offset + (n - 1) * 7);
}

/**
 * NJUPT calendar: Semester 1 → 2nd Monday of Sep, Semester 2 → 1st Monday of Mar.
 */
function getDefaultDate(year: string, semester: string): string {
  const [startYear, endYear] = year.split('-').map(Number);
  if (!startYear || !endYear) return new Date().getFullYear() + '-09-01';

  const d = semester === '1' ? nthMonday(startYear, 9, 2) : nthMonday(endYear, 3, 1);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateKey(xh: string, year: string, sem: string): string {
  return `njupt-schedule:startDate:${xh}:${year}:${sem}`;
}

type ExportFormat = 'ics' | 'json' | 'markdown';
const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const BTN = 'py-2 rounded font-medium text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export function ScheduleExporter() {
  const [loading, setLoading] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // On mount: load saved date for current student+semester, or algorithm default
  useEffect(() => {
    const data = parseScheduleData(getEvalDocument());
    const key = dateKey(data.studentInfo.xh, data.semesterInfo.year, data.semesterInfo.semester);
    const def = getDefaultDate(data.semesterInfo.year, data.semesterInfo.semester);

    chrome.storage.local.get([key]).then(raw => {
      setDateInput((raw[key] as string) || def);
    });
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const download = useCallback((content: string, file: string, mime: string) => {
    const b = new Blob([content], { type: mime });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(u);
  }, []);

  const persist = useCallback((d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
    const data = parseScheduleData(getEvalDocument());
    const key = dateKey(data.studentInfo.xh, data.semesterInfo.year, data.semesterInfo.semester);
    chrome.storage.local.set({ [key]: d });
    setDateInput(d);
  }, []);

  const resetDefault = useCallback(() => {
    const data = parseScheduleData(getEvalDocument());
    const def = getDefaultDate(data.semesterInfo.year, data.semesterInfo.semester);
    const key = dateKey(data.studentInfo.xh, data.semesterInfo.year, data.semesterInfo.semester);
    chrome.storage.local.remove([key]);
    setDateInput(def);
  }, []);

  const doExport = useCallback((date: string, fmt: ExportFormat) => {
    try {
      const data = parseScheduleData(getEvalDocument());
      if (data.courses.length === 0 && fmt !== 'json') { alert('未识别到课程'); return; }

      const sfx = data.semesterInfo.year ? `_${data.semesterInfo.year}_${data.semesterInfo.semester}` : '';

      const [content, file, mime] = fmt === 'ics'
        ? [generateICS(data.courses, date), `njupt_schedule${sfx}.ics`, 'text/calendar;charset=utf-8']
        : fmt === 'json'
        ? [exportJSON(data), `njupt_schedule${sfx}.json`, 'application/json;charset=utf-8']
        : [exportMarkdown(data, date), `njupt_schedule${sfx}.md`, 'text/markdown;charset=utf-8'];

      download(content, file, mime);

      const key = dateKey(data.studentInfo.xh, data.semesterInfo.year, data.semesterInfo.semester);
      chrome.storage.local.set({ [key]: date });
    } catch (e) {
      alert('导出失败: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [download]);

  const handleExport = (fmt: ExportFormat) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) { alert('请设置有效的学期开始日期'); return; }
    setLoading(true);
    doExport(dateInput, fmt);
  };

  const d = new Date(dateInput + 'T00:00:00');
  const day = isNaN(d.getTime()) ? '' : ` 周${DAYS[d.getDay()]}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded p-2">
        <span className="text-gray-400">学期开始：</span>
        <div className="flex items-center gap-1">
          {editing ? (
            <input ref={inputRef} type="date" value={dateInput}
              onChange={e => setDateInput(e.target.value)}
              onBlur={() => { persist(dateInput); setEditing(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { persist(dateInput); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
              onMouseDown={e => e.stopPropagation()}
              className="text-xs border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400 w-28" />
          ) : (
            <span className="font-medium text-gray-600 cursor-pointer hover:text-blue-600 border-b border-dashed border-gray-300"
              onClick={() => setEditing(true)} onMouseDown={e => e.stopPropagation()}>
              {dateInput}{day}
            </span>
          )}
          <button onClick={resetDefault} onMouseDown={e => e.stopPropagation()}
            className="text-gray-400 hover:text-blue-500 text-xs" title="恢复为校历默认日期">↺</button>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => handleExport('ics')} disabled={loading} className={`flex-1 ${BTN} bg-green-600 hover:bg-green-700`}>
          {loading ? '导出中...' : '导出 ICS'}
        </button>
        <button onClick={() => handleExport('json')} disabled={loading} className={`flex-1 ${BTN} bg-blue-600 hover:bg-blue-700`}>JSON</button>
        <button onClick={() => handleExport('markdown')} disabled={loading} className={`flex-1 ${BTN} bg-purple-600 hover:bg-purple-700`}>MD</button>
      </div>
    </div>
  );
}
