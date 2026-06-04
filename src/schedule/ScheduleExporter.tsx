import { useState, useCallback, useEffect } from 'react';
import { parseSchedule } from './parser';
import { generateICS } from './ics';
import { useEvalStore } from '../content/store';
import { getEvalDocument } from '../content/dom-analyzer';

function getDefaultDate(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  return (month >= 2 && month <= 7) ? `${now.getFullYear()}-02-17` : `${month >= 8 ? now.getFullYear() : now.getFullYear() - 1}-09-02`;
}

export function ScheduleExporter() {
  const settings = useEvalStore((s) => s.settings);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dateInput, setDateInput] = useState('');

  // Load saved startDate from chrome.storage on mount
  useEffect(() => {
    (async () => {
      const raw = await new Promise<Record<string, unknown>>((resolve) =>
        chrome.storage.local.get('njupt-schedule:startDate', resolve),
      );
      const saved = raw['njupt-schedule:startDate'] as string | undefined;
      if (!saved) {
        setDateInput(getDefaultDate());
        setShowModal(true);
      }
    })();
  }, []);

  const doExport = useCallback((startDate: string) => {
    try {
      const doc = getEvalDocument();
      const courses = parseSchedule(doc);
      if (courses.length === 0) {
        alert('未识别到课程，请确认当前页面有课表表格。');
        return;
      }
      const ics = generateICS(courses, startDate);
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'njupt_schedule.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Save startDate for next time
      chrome.storage.local.set({ 'njupt-schedule:startDate': startDate });
    } catch (e) {
      alert('导出失败: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    setLoading(true);
    const saved = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get('njupt-schedule:startDate', resolve),
    );
    const startDate = saved['njupt-schedule:startDate'] as string | undefined;
    if (!startDate) {
      setDateInput(getDefaultDate());
      setShowModal(true);
      setLoading(false);
      return;
    }
    doExport(startDate);
  }, [doExport]);

  const handleDateConfirm = useCallback(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      alert('日期格式不正确，请使用 YYYY-MM-DD 格式');
      return;
    }
    setShowModal(false);
    setLoading(true);
    doExport(dateInput);
  }, [dateInput, doExport]);

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100000]" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 border-2 border-blue-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">设置学期开始日期</h3>
            <p className="text-gray-500 text-sm mb-4">请输入本学期<strong>第1周周一</strong>的日期</p>
            <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none" />
            <div className="flex gap-3">
              <button onClick={handleDateConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium">确认导出</button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-medium">取消</button>
            </div>
          </div>
        </div>
      )}
      <button onClick={handleExport} disabled={loading}
        className="w-full py-2 rounded font-medium text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {loading ? '导出中...' : '导出课表 ICS'}
      </button>
    </>
  );
}
