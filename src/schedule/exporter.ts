import type { ScheduleData, Course } from './parser';

const DAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const SLOT_LABELS: Record<number, string> = {
  1: '第1节 (08:00)', 2: '第2节 (08:55)', 3: '第3节 (10:00)',
  4: '第4节 (10:55)', 5: '第5节 (11:50)',
  6: '第6节 (13:45)', 7: '第7节 (14:40)', 8: '第8节 (15:40)',
  9: '第9节 (16:35)', 10: '第10节 (18:30)', 11: '第11节 (19:25)',
  12: '第12节 (20:20)',
};
const ALL_SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);
const ALL_DAYS = Array.from({ length: 7 }, (_, i) => i + 1);

/**
 * Generate a comprehensive JSON export of the full schedule data.
 */
export function exportJSON(data: ScheduleData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Build a 7-day × 12-slot grid of course names for the markdown table.
 */
function buildGrid(courses: Course[]): Map<number, Map<number, string[]>> {
  const grid = new Map<number, Map<number, string[]>>();

  for (const c of courses) {
    if (!grid.has(c.day)) grid.set(c.day, new Map());
    const dayMap = grid.get(c.day)!;

    const label = `${c.name}（${c.teacher}）${c.location} ${c.startWeek}-${c.endWeek}周${c.weekType !== 'all' ? c.weekType : ''}`;
    for (const slot of c.slots) {
      if (!dayMap.has(slot)) dayMap.set(slot, []);
      dayMap.get(slot)!.push(label);
    }
  }

  return grid;
}

/**
 * Generate a human-readable Markdown export of the schedule.
 * @param data - complete parsed schedule data
 * @param startDate - semester start date (YYYY-MM-DD), used for context
 */
export function exportMarkdown(data: ScheduleData, startDate: string): string {
  const { studentInfo, semesterInfo, courses, adjustments, practicalCourses, unscheduledCourses } = data;
  const grid = buildGrid(courses);

  const lines: string[] = [];

  // Title
  lines.push(`# 南邮课表 — ${studentInfo.name} ${semesterInfo.yearText}学年第${semesterInfo.semesterText}学期`);
  lines.push('');

  // Student info
  lines.push('## 学生信息');
  lines.push('');
  lines.push('| 项目 | 内容 |');
  lines.push('|------|------|');
  lines.push(`| 学号 | ${studentInfo.xh} |`);
  lines.push(`| 姓名 | ${studentInfo.name} |`);
  lines.push(`| 学院 | ${studentInfo.college} |`);
  lines.push(`| 专业 | ${studentInfo.major} |`);
  lines.push(`| 行政班 | ${studentInfo.className} |`);
  lines.push(`| 学期 | ${semesterInfo.yearText} 学年第 ${semesterInfo.semesterText} 学期 |`);
  lines.push(`| 学期开始日期 | ${startDate}（第1周周一） |`);
  lines.push('');

  // Weekly schedule table
  lines.push('## 周课表');
  lines.push('');
  lines.push('| 节次 | 周一 | 周二 | 周三 | 周四 | 周五 | 周六 | 周日 |');
  lines.push('|------|------|------|------|------|------|------|------|');

  for (const slot of ALL_SLOTS) {
    const cells: string[] = [SLOT_LABELS[slot] || `第${slot}节`];
    for (const day of ALL_DAYS) {
      const entries = grid.get(day)?.get(slot);
      cells.push(entries ? entries.join('；') : '');
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  // Course detail list
  lines.push('## 课程详情');
  lines.push('');

  // Sort courses by day then start slot
  const sorted = [...courses].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    const aStart = a.slots[0] ?? 0;
    const bStart = b.slots[0] ?? 0;
    return aStart - bStart;
  });

  for (const c of sorted) {
    const slots = c.slots.join(',');
    const weekInfo = `${c.startWeek}-${c.endWeek}周` + (c.weekType !== 'all' ? ` ${c.weekType}周` : '');
    lines.push(`- **${c.name}** | ${DAY_LABELS[c.day]} 第${slots}节 | ${weekInfo} | ${c.teacher} | ${c.location}`);
  }
  lines.push('');

  // Adjustments
  if (adjustments.length > 0) {
    lines.push('## 调、停（补）课信息');
    lines.push('');
    lines.push('| 编号 | 课程 | 原安排 | 现安排 | 申请时间 |');
    lines.push('|------|------|--------|--------|----------|');
    for (const a of adjustments) {
      lines.push(`| ${a.id} | ${a.courseName} | ${a.originalSchedule} | ${a.newSchedule || '—'} | ${a.applyTime} |`);
    }
    lines.push('');
  }

  // Practical courses
  if (practicalCourses.length > 0) {
    lines.push('## 实践课');
    lines.push('');
    lines.push('| 课程 | 教师 | 学分 | 起止周 | 时间 | 地点 |');
    lines.push('|------|------|------|--------|------|------|');
    for (const c of practicalCourses) {
      lines.push(`| ${c.name} | ${c.teacher} | ${c.credits} | ${c.weeks} | ${c.time || '—'} | ${c.location || '—'} |`);
    }
    lines.push('');
  }

  // Unscheduled courses
  if (unscheduledCourses.length > 0) {
    lines.push('## 未安排上课时间的课程');
    lines.push('');
    lines.push('| 学年 | 学期 | 课程 | 教师 | 学分 |');
    lines.push('|------|------|------|------|------|');
    for (const c of unscheduledCourses) {
      lines.push(`| ${c.year} | ${c.semester} | ${c.name} | ${c.teacher} | ${c.credits} |`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*由 南邮教务助手 生成于 ${new Date().toLocaleString('zh-CN')}*`);

  return lines.join('\n');
}
