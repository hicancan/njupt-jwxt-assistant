import { useState, useCallback } from 'react';
import { parseGrades } from './parser';
import { exportJSON, exportMarkdown } from './exporter';
import { getEvalDocument } from '../content/dom-analyzer';

const BTN = 'py-2 rounded font-medium text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export function GradeExporter() {
  const [loading, setLoading] = useState(false);

  const download = useCallback((content: string, file: string, mime: string) => {
    const b = new Blob([content], { type: mime });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(u);
  }, []);

  const doExport = useCallback((format: 'json' | 'md') => {
    try {
      const doc = getEvalDocument();
      const data = parseGrades(doc);
      if (data.entries.length === 0 && data.failedCourses.length === 0) {
        alert('未识别到成绩数据，请先点击查询按钮。');
        return;
      }

      // Build filename suffix from query mode
      const q = data.queryMode;
      const y = data.semesterInfo.year.replace(/[\\/:*?"<>|]/g, '');
      const s = data.semesterInfo.semester;
      const sfx = q === 'semester' ? `_${y}_${s}`
        : q === 'year' ? `_${y}`
        : q === 'max' ? '_max'
        : '_all';
      const [content, file, mime] = format === 'json'
        ? [exportJSON(data), `njupt_grades${sfx}.json`, 'application/json;charset=utf-8']
        : [exportMarkdown(data), `njupt_grades${sfx}.md`, 'text/markdown;charset=utf-8'];

      download(content, file, mime);
    } catch (e) {
      alert('导出失败: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [download]);

  return (
    <div className="flex gap-2">
      <button onClick={() => { setLoading(true); doExport('json'); }} disabled={loading}
        className={`flex-1 ${BTN} bg-blue-600 hover:bg-blue-700`}>
        {loading ? '导出中...' : '导出成绩 JSON'}
      </button>
      <button onClick={() => { setLoading(true); doExport('md'); }} disabled={loading}
        className={`flex-1 ${BTN} bg-purple-600 hover:bg-purple-700`}>
        {loading ? '导出中...' : '导出成绩 MD'}
      </button>
    </div>
  );
}
