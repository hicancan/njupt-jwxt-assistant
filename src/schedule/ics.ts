import type { Course } from './parser';

export const DEFAULT_TIMES: Record<number, { s: string; e: string }> = {
  1: { s: '0800', e: '0845' },   2: { s: '0855', e: '0940' },
  3: { s: '1000', e: '1045' },   4: { s: '1055', e: '1140' },
  5: { s: '1150', e: '1235' },
  6: { s: '1345', e: '1430' },   7: { s: '1440', e: '1525' },
  8: { s: '1540', e: '1625' },   9: { s: '1635', e: '1720' },
  10: { s: '1830', e: '1915' },  11: { s: '1925', e: '2010' },
  12: { s: '2020', e: '2105' },
};

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}@njupt.edu.cn`;
}

function fmtDateUTC(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function fmtTimeUTC(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function fmtDateLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Generate an ICS (iCalendar) file from parsed courses.
 * @param courses - parsed course list
 * @param semesterStartStr - first Monday of the semester (YYYY-MM-DD)
 * @param customTimes - optional custom time slot mapping
 */
export function generateICS(
  courses: Course[],
  semesterStartStr: string,
  customTimes?: Record<number, { s: string; e: string }>,
): string {
  if (!semesterStartStr) throw new Error('未设置学期开始日期');

  const semesterStart = new Date(semesterStartStr);
  if (isNaN(semesterStart.getTime())) throw new Error('学期开始日期无效');

  const timeMap = customTimes || DEFAULT_TIMES;
  const now = new Date();
  const dtstamp = `${fmtDateUTC(now)}T${fmtTimeUTC(now)}Z`;

  const vcal: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NJUPT//Course Schedule//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:Asia/Shanghai',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Shanghai',
    'X-LIC-LOCATION:Asia/Shanghai',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const c of courses) {
    for (let w = c.startWeek; w <= c.endWeek; w++) {
      if (c.weekType.includes('单') && w % 2 === 0) continue;
      if (c.weekType.includes('双') && w % 2 !== 0) continue;

      const eventDate = new Date(semesterStart);
      eventDate.setDate(semesterStart.getDate() + (w - 1) * 7 + (c.day - 1));

      const startSlot = c.slots[0];
      const endSlot = c.slots[c.slots.length - 1];
      if (startSlot == null || endSlot == null) continue;

      const st = timeMap[startSlot] || { s: '0000', e: '0000' };
      const et = timeMap[endSlot] || { s: '0000', e: '0000' };

      const dayStr = fmtDateLocal(eventDate);
      vcal.push(
        'BEGIN:VEVENT',
        `UID:${uid()}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=Asia/Shanghai:${dayStr}T${st.s}00`,
        `DTEND;TZID=Asia/Shanghai:${dayStr}T${et.e}00`,
        `SUMMARY:${esc(c.name)}`,
        `DESCRIPTION:第${w}周 ${esc(c.teacher || '')}`,
        `LOCATION:${esc(c.location)}`,
        'END:VEVENT',
      );
    }
  }

  vcal.push('END:VCALENDAR');
  return vcal.join('\r\n');
}
