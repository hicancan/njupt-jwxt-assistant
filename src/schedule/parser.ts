import { z } from 'zod';

export const CourseSchema = z.object({
  name: z.string(),
  teacher: z.string(),
  location: z.string(),
  day: z.number(),           // 1=Mon ... 7=Sun
  startWeek: z.number(),
  endWeek: z.number(),
  weekType: z.string(),      // 'all' | '单' | '双'
  slots: z.array(z.number()), // e.g. [1,2] for 第1,2节
});

export type Course = z.infer<typeof CourseSchema>;

// ---- Additional schemas for comprehensive schedule data ----

export const StudentInfoSchema = z.object({
  xh: z.string(),            // 学号
  name: z.string(),          // 姓名
  college: z.string(),       // 学院
  major: z.string(),         // 专业
  className: z.string(),     // 行政班
});

export const SemesterInfoSchema = z.object({
  year: z.string(),          // e.g. "2025-2026"
  yearText: z.string(),
  semester: z.string(),      // e.g. "2"
  semesterText: z.string(),
});

export const AdjustmentSchema = z.object({
  id: z.string(),            // e.g. "停0115"
  courseName: z.string(),
  originalSchedule: z.string(),
  newSchedule: z.string(),
  applyTime: z.string(),
});

export const PracticalCourseSchema = z.object({
  name: z.string(),
  teacher: z.string(),
  credits: z.string(),
  weeks: z.string(),
  time: z.string(),
  location: z.string(),
});

export const UnscheduledCourseSchema = z.object({
  year: z.string(),
  semester: z.string(),
  name: z.string(),
  teacher: z.string(),
  credits: z.string(),
});

export const ScheduleDataSchema = z.object({
  studentInfo: StudentInfoSchema,
  semesterInfo: SemesterInfoSchema,
  courses: z.array(CourseSchema),
  adjustments: z.array(AdjustmentSchema),
  practicalCourses: z.array(PracticalCourseSchema),
  unscheduledCourses: z.array(UnscheduledCourseSchema),
});

export type StudentInfo = z.infer<typeof StudentInfoSchema>;
export type SemesterInfo = z.infer<typeof SemesterInfoSchema>;
export type Adjustment = z.infer<typeof AdjustmentSchema>;
export type PracticalCourse = z.infer<typeof PracticalCourseSchema>;
export type UnscheduledCourse = z.infer<typeof UnscheduledCourseSchema>;
export type ScheduleData = z.infer<typeof ScheduleDataSchema>;

// ---- Parsing functions ----

/**
 * Parse the NJUPT student schedule table (#Table1).
 * Handles rowspan/colspan, extracts course name, time info, teacher, location.
 * Detects and skips cancelled courses (preceded by (停XXXX) markers).
 */
export function parseSchedule(doc: Document | Element = document): Course[] {
  const table = doc.querySelector('#Table1') as HTMLTableElement | null;
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return [];

  // Grid tracking for rowspan/colspan
  const grid: boolean[][] = Array.from({ length: 15 }, () => new Array(8).fill(false));
  const courses: Course[] = [];

  // Find the first row containing "第1节"
  let startRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.textContent.includes('第1节')) { startRow = i; break; }
  }
  if (startRow === -1) return [];

  let logicalRow = 1;
  for (let r = startRow; r < rows.length; r++) {
    const tr = rows[r];
    if (!tr) continue;

    const cells = Array.from(tr.children) as HTMLElement[];
    let cellIndex = 0;

    for (let c = 0; c <= 7; c++) {
      if (grid[logicalRow - 1]?.[c]) continue;
      if (cellIndex >= cells.length) break;

      const cell = cells[cellIndex];
      if (!cell) { cellIndex++; continue; }

      const rowSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
      const colSpan = parseInt(cell.getAttribute('colspan') || '1', 10);

      for (let rs = 0; rs < rowSpan; rs++) {
        for (let cs = 0; cs < colSpan; cs++) {
          const targetRow = grid[logicalRow - 1 + rs];
          if (targetRow) targetRow[c + cs] = true;
        }
      }

      // Columns 2-8 = day 1-7 (Mon-Sun)
      if (c >= 2 && c <= 8) {
        parseCell(cell, c - 1, courses);
      }
      cellIndex++;
    }
    logicalRow++;
  }

  return courses;
}

function parseCell(cell: HTMLElement, dayIndex: number, courseList: Course[]): void {
  let html = cell.innerHTML.trim();
  if (!html || html === '&nbsp;') return;

  html = html.replace(/<br\s*\/?>/gi, '\n');
  const blocks = html.split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

    // Skip cancel marker blocks: (停XXXX) markers replace cancelled course entries.
    // They are standalone informational markers, not indicators for adjacent courses.
    if (lines.length < 3 && /\(停\d+\)/.test(block)) {
      continue;
    }

    if (lines.length < 3) continue;

    const name = lines[0];
    if (!name || name.startsWith('(停')) continue;

    // Time info line contains {第N-M周} pattern
    const timeStr = lines.find(l => l.includes('{') && l.includes('}')) || lines[1] || '';
    // Teacher line
    const teacher = (lines[2] === timeStr) ? (lines[1] || '') : (lines[2] || '');
    const location = lines[3] || '未知地点';

    const weekMatch = timeStr.match(/\{.*?(第)?(\d+)-(\d+)周.*?(\|.*?)?\}/);
    const startWeek = weekMatch ? parseInt(weekMatch[2], 10) : 1;
    const endWeek = weekMatch ? parseInt(weekMatch[3], 10) : 16;
    let type = 'all';
    if (weekMatch?.[4]) {
      const t = weekMatch[4].replace('|', '');
      if (t.includes('单')) type = '单';
      else if (t.includes('双')) type = '双';
    }

    const slotMatch = timeStr.match(/第([\d,]+)节/);
    const slots = slotMatch
      ? slotMatch[1].split(',').map(Number).filter(n => !isNaN(n))
      : [];

    if (name && slots.length > 0) {
      const course = { name, teacher, location, day: dayIndex, startWeek, endWeek, weekType: type, slots };
      const result = CourseSchema.safeParse(course);
      if (result.success) courseList.push(result.data);
    }
  }
}

// ---- Additional parsers for comprehensive schedule export ----

/**
 * Extract student info from the schedule page.
 */
export function parseStudentInfo(doc: Document = document): StudentInfo {
  const text = doc.body?.textContent || '';

  const xh = text.match(/学号[：:]\s*(\w+)/)?.[1] || '';
  const name = text.match(/姓名[：:]\s*([^|\s]+)/)?.[1] || '';
  const college = text.match(/学院[：:]\s*([^|\s]+)/)?.[1] || '';
  const major = text.match(/专业[：:]\s*([^|\s]+)/)?.[1] || '';
  const className = text.match(/行政班[：:]\s*(\S+)/)?.[1] || '';

  return StudentInfoSchema.parse({ xh, name, college, major, className });
}

/**
 * Extract semester info from #xnd and #xqd select elements.
 */
export function parseSemesterInfo(doc: Document = document): SemesterInfo {
  const xnd = doc.getElementById('xnd') as HTMLSelectElement | null;
  const xqd = doc.getElementById('xqd') as HTMLSelectElement | null;

  const year = xnd?.value || '';
  const yearText = xnd?.options[xnd?.selectedIndex ?? 0]?.text || '';
  const semester = xqd?.value || '';
  const semesterText = xqd?.options[xqd?.selectedIndex ?? 0]?.text || '';

  return SemesterInfoSchema.parse({ year, yearText, semester, semesterText });
}

/**
 * Parse course adjustments (调、停（补）课信息) from #DBGrid.
 */
export function parseAdjustments(doc: Document = document): Adjustment[] {
  const table = doc.getElementById('DBGrid') as HTMLTableElement | null;
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tr'));
  const results: Adjustment[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td'));
    if (cells.length < 5) continue;

    const adj = {
      id: cells[0]?.textContent?.trim() || '',
      courseName: cells[1]?.textContent?.trim() || '',
      originalSchedule: cells[2]?.textContent?.trim() || '',
      newSchedule: cells[3]?.textContent?.trim() || '',
      applyTime: cells[4]?.textContent?.trim() || '',
    };

    if (adj.id && adj.courseName) {
      const result = AdjustmentSchema.safeParse(adj);
      if (result.success) results.push(result.data);
    }
  }

  return results;
}

/**
 * Parse practical courses (实践课(或无上课时间)信息) from #DataGrid1 inside #Table3.
 */
export function parsePracticalCourses(doc: Document = document): PracticalCourse[] {
  const table3 = doc.getElementById('Table3') as HTMLElement | null;
  if (!table3) return [];

  const dg = table3.querySelector('table#DataGrid1, table.datelist') as HTMLTableElement | null;
  if (!dg) return [];

  const rows = Array.from(dg.querySelectorAll('tr'));
  const results: PracticalCourse[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td'));
    if (cells.length < 5) continue;

    const pc = {
      name: cells[0]?.textContent?.trim() || '',
      teacher: cells[1]?.textContent?.trim() || '',
      credits: cells[2]?.textContent?.trim() || '',
      weeks: cells[3]?.textContent?.trim() || '',
      time: cells[4]?.textContent?.trim() || '',
      location: cells[5]?.textContent?.trim() || '',
    };

    if (pc.name) {
      const result = PracticalCourseSchema.safeParse(pc);
      if (result.success) results.push(result.data);
    }
  }

  return results;
}

/**
 * Parse unscheduled courses (未安排上课时间的课程) from #Datagrid2.
 */
export function parseUnscheduledCourses(doc: Document = document): UnscheduledCourse[] {
  const table = doc.getElementById('Datagrid2') as HTMLTableElement | null;
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tr'));
  const results: UnscheduledCourse[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td'));
    if (cells.length < 5) continue;

    const uc = {
      year: cells[0]?.textContent?.trim() || '',
      semester: cells[1]?.textContent?.trim() || '',
      name: cells[2]?.textContent?.trim() || '',
      teacher: cells[3]?.textContent?.trim() || '',
      credits: cells[4]?.textContent?.trim() || '',
    };

    if (uc.name) {
      const result = UnscheduledCourseSchema.safeParse(uc);
      if (result.success) results.push(result.data);
    }
  }

  return results;
}

/**
 * Parse the complete schedule data from the document.
 */
export function parseScheduleData(doc: Document = document): ScheduleData {
  return ScheduleDataSchema.parse({
    studentInfo: parseStudentInfo(doc),
    semesterInfo: parseSemesterInfo(doc),
    courses: parseSchedule(doc),
    adjustments: parseAdjustments(doc),
    practicalCourses: parsePracticalCourses(doc),
    unscheduledCourses: parseUnscheduledCourses(doc),
  });
}
