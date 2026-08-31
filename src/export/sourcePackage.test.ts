import { describe, expect, it } from 'vitest';
import type { CaptureJob, NormalizedSchedule } from '../contracts/model';
import { buildSourcePackage, canonicalJson } from './sourcePackage';

describe('canonical source package', () => {
  it('orders object keys without changing array order', () => {
    expect(canonicalJson({ z: 1, a: [{ b: 2, a: 1 }] })).toBe('{"a":[{"a":1,"b":2}],"z":1}\n');
  });

  it('builds deterministic zip bytes with a valid zip timestamp', async () => {
    const descriptor = { descriptor_id: 'one', class_id: 'B240402', name: 'B240402课表', campus_id: '2', campus: '仙林', grade: '2024', college_id: null, college: null, major_id: null, major: null, direction_id: null, direction: null, level: null, timetable_kind: '1', timetable_display: '0' };
    const result: NormalizedSchedule = { descriptor, status: 'success', meetings: [], practice_notes: [], supplemental: {}, weeks: [{ week: 1, start_date: '2026-08-31', end_date: '2026-09-06' }], weekday_names: { '1': '星期一' }, first_weekday: 1, error: null };
    const job: CaptureJob = { job_id: 'job', term: { academic_year: '2026-2027', term_number: 1, internal_year_code: '2026', internal_term_code: '3' }, observed_at: '2026-08-31T00:00:00Z', lifecycle: 'complete', catalog: [descriptor], periods: [{ period: 1, start_time: '08:00', end_time: '08:45', day_part: 'morning' }], progress: { total: 1, completed: 1, success: 1, empty: 0, special: 0, failed: 0, current: null }, last_error: null };
    const first = await buildSourcePackage(job, [result]);
    const second = await buildSourcePackage(job, [result]);
    expect(first.manifest).toEqual(second.manifest);
    expect(first.archive).toEqual(second.archive);
  });
});
