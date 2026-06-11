import type { GradeData } from './parser';

export function exportJSON(data: GradeData): string {
  return JSON.stringify(data, null, 2);
}

export function exportMarkdown(data: GradeData): string {
  const { studentInfo, semesterInfo, headerText, creditStats, entries, categorySummary, attributionSummary, yearSummary, gpaText, failedCourses } = data;
  const l: string[] = [];

  l.push(`# 成绩单 — ${studentInfo.name} ${headerText}`);
  l.push('');
  l.push('## 学生信息');
  l.push('');
  l.push('| 项目 | 内容 |');
  l.push('|------|------|');
  l.push(`| 学号 | ${studentInfo.xh} |`);
  l.push(`| 姓名 | ${studentInfo.name} |`);
  l.push(`| 学院 | ${studentInfo.college} |`);
  l.push(`| 专业 | ${studentInfo.major} |`);
  l.push(`| 行政班 | ${studentInfo.className} |`);
  l.push(`| 查询范围 | ${headerText} |`);
  if (creditStats) { l.push(`| 学分统计 | ${creditStats} |`); }
  if (gpaText) { l.push(`| GPA | ${gpaText} |`); }
  l.push('');

  // Grade table
  const isMaxMode = data.queryMode === 'max';
  l.push('## 成绩明细');
  l.push('');

  if (isMaxMode) {
    l.push('| # | 学年学期 | 课程代码 | 课程名称 | 学分 | 最高成绩 | 课程性质 | 课程归属 |');
    l.push('|---|----------|----------|----------|------|----------|----------|----------|');
    entries.forEach((e, i) => {
      l.push(`| ${i + 1} | ${e.year}-${e.semester} | ${e.code} | ${e.name} | ${e.credits} | ${e.score || '—'} | ${e.category} | ${e.attribution || '—'} |`);
    });
  } else {
    l.push('| # | 课程名称 | 课程性质 | 学分 | 成绩 | 绩点 | 学年学期 | 课程归属 | 学院 |');
    l.push('|---|----------|----------|------|------|------|----------|----------|------|');
    entries.forEach((e, i) => {
      l.push(`| ${i + 1} | ${e.name} | ${e.category} | ${e.credits} | ${e.score} | ${e.gradePoint || '—'} | ${e.year}-${e.semester} | ${e.attribution || '—'} | ${e.college} |`);
    });
  }
  l.push('');

  // Category summary
  if (categorySummary.length > 0) {
    l.push('## 课程性质统计');
    l.push('');
    l.push('| 课程性质 | 学分要求 | 获得学分 | 未通过学分 | 还需学分 |');
    l.push('|----------|----------|----------|------------|----------|');
    for (const c of categorySummary) {
      l.push(`| ${c.name} | ${c.creditRequired} | ${c.creditEarned} | ${c.creditFailed} | ${c.creditNeeded} |`);
    }
    l.push('');
  }

  // Attribution summary
  if (attributionSummary.length > 0) {
    l.push('## 课程归属统计');
    l.push('');
    l.push('| 课程归属 | 学分要求 | 获得学分 | 未通过学分 | 还需学分 |');
    l.push('|----------|----------|----------|------------|----------|');
    for (const c of attributionSummary) {
      l.push(`| ${c.name} | ${c.creditRequired} | ${c.creditEarned} | ${c.creditFailed} | ${c.creditNeeded} |`);
    }
    l.push('');
  }

  // Failed courses
  if (failedCourses.length > 0) {
    l.push('## 至今未通过课程');
    l.push('');
    l.push('| 课程代码 | 课程名称 | 学分 | 课程性质 | 最高成绩值 | 课程归属 |');
    l.push('|----------|----------|------|----------|------------|----------|');
    for (const f of failedCourses) {
      l.push(`| ${f.code} | ${f.name} | ${f.credits} | ${f.category} | ${f.maxScore} | ${f.attribution} |`);
    }
    l.push('');
  }

  l.push('---');
  l.push(`*由 南邮教务助手 生成于 ${new Date().toLocaleString('zh-CN')}*`);

  return l.join('\n');
}
