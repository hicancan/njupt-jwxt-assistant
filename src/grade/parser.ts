import { z } from 'zod';

export const GradeEntrySchema = z.object({
  year: z.string(),
  semester: z.string(),
  code: z.string(),
  name: z.string(),
  category: z.string(),       // 课程性质: 必修/限选/任选
  attribution: z.string(),     // 课程归属: 全校任选课 etc
  credits: z.string(),
  gradePoint: z.string(),      // 绩点 (may be empty for pass/fail courses)
  score: z.string(),           // 成绩: numeric or 优秀/良好 etc
  minorFlag: z.string(),       // 辅修标记
  retakeScore: z.string(),     // 补考成绩
  rebuildScore: z.string(),    // 重修成绩
  college: z.string(),         // 学院名称
  remark: z.string(),          // 备注
  retakeFlag: z.string(),      // 重修标记
  englishName: z.string(),     // 课程英文名称
});

export type GradeEntry = z.infer<typeof GradeEntrySchema>;

export const CategorySummarySchema = z.object({
  name: z.string(),
  creditRequired: z.string(),
  creditEarned: z.string(),
  creditFailed: z.string(),
  creditNeeded: z.string(),
});

export const GradeDataSchema = z.object({
  studentInfo: z.object({
    xh: z.string(),
    name: z.string(),
    college: z.string(),
    major: z.string(),
    className: z.string(),
  }),
  semesterInfo: z.object({
    year: z.string(),
    yearText: z.string(),
    semester: z.string(),
    semesterText: z.string(),
  }),
  headerText: z.string(),
  queryMode: z.enum(['semester', 'year', 'all', 'max']),          // "2025-2026学年第1学期学习成绩" or similar
  creditStats: z.string(),         // "所选学分25.50；获得学分25.50；重修学分0。"
  entries: z.array(GradeEntrySchema),
  categorySummary: z.array(CategorySummarySchema),
  attributionSummary: z.array(CategorySummarySchema),
  yearSummary: z.array(z.object({
    year: z.string(),
    semester: z.string(),
    earned: z.string(),
    failedCourses: z.string(),
    failedCredits: z.string(),
    warning: z.string(),
  })),
  gpaText: z.string(),
  rankingText: z.string(),
  failedCourses: z.array(z.object({
    code: z.string(),
    name: z.string(),
    credits: z.string(),
    category: z.string(),
    maxScore: z.string(),
    attribution: z.string(),
  })),
});

export type GradeData = z.infer<typeof GradeDataSchema>;

function cellText(cell: Element | null): string {
  return cell?.textContent?.trim() || '';
}

export function parseGrades(doc: Document = document): GradeData {
  const bodyText = doc.body?.textContent || '';

  // Student info
  const xh = bodyText.match(/学号[：:]\s*(\w+)/)?.[1] || '';
  const name = bodyText.match(/姓名[：:]\s*([^|\s]+)/)?.[1] || '';
  const college = bodyText.match(/学院[：:]\s*([^|\s]+)/)?.[1] || '';
  const majorMatch = bodyText.match(/专业[：:]\s*(.+?)\s*行政班/);
  const major = majorMatch?.[1]?.trim().replace(/\s+/g, '') || '';
  const className = bodyText.match(/行政班[：:]\s*(\w+)/)?.[1] || '';

  // Semester info — prefer selects, fall back to header text
  const xnd = doc.getElementById('xnd') as HTMLSelectElement | null;
  const xqd = doc.getElementById('xqd') as HTMLSelectElement | null;
  let year = xnd?.value || '';
  let yearText = xnd?.options[xnd?.selectedIndex ?? 0]?.text || '';
  let semester = xqd?.value || '';
  let semesterText = xqd?.options[xqd?.selectedIndex ?? 0]?.text || '';

  // Header text determines the actual query mode
  let headerText = '';
  let queryMode: 'semester' | 'year' | 'all' | 'max' = 'all';

  const semMatch = bodyText.match(/(\d{4}-\d{4})学年第(\d)学期学习成绩/);
  const yearOnlyMatch = bodyText.match(/(\d{4}-\d{4})学年学习成绩/);
  const allMatch = bodyText.match(/(在校学习成绩)/);
  const maxMatch = bodyText.match(/(已修课程最高成绩)/);

  if (semMatch) {
    headerText = semMatch[0];
    queryMode = 'semester';
    if (!year) { year = semMatch[1]; yearText = semMatch[1]; }
    if (!semester) { semester = semMatch[2]; semesterText = semMatch[2]; }
  } else if (yearOnlyMatch) {
    headerText = yearOnlyMatch[0];
    queryMode = 'year';
    if (!year) { year = yearOnlyMatch[1]; yearText = yearOnlyMatch[1]; }
  } else if (allMatch) {
    headerText = allMatch[1];
    queryMode = 'all';
  } else if (maxMatch) {
    headerText = maxMatch[1];
    queryMode = 'max';
  }

  // Credit stats
  const creditMatch = bodyText.match(/所选学分([\d.]+)；获得学分([\d.]+)；重修学分([\d.]+)/);
  const creditStats = creditMatch ? creditMatch[0] : '';

  // Main grade table
  const entries: GradeEntry[] = [];

  if (queryMode === 'max') {
    // "已修课程最高成绩" — different table structure
    // Columns: 学年, 学期, 课程代码, 课程名称, 学分, 课程性质, 最高成绩值, 课程归属
    const maxTable = doc.querySelector('table.datelist[id]') as HTMLTableElement | null;
    if (maxTable) {
      const rows = Array.from(maxTable.querySelectorAll('tr'));
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'));
        if (cells.length < 7) continue;
        const entry = {
          year: cellText(cells[0]), semester: cellText(cells[1]),
          code: cellText(cells[2]), name: cellText(cells[3]),
          credits: cellText(cells[4]), category: cellText(cells[5]),
          score: cellText(cells[6]),       // 最高成绩值 (numeric or 优秀/良好)
          attribution: cellText(cells[7]),  // 课程归属
          gradePoint: '',
          minorFlag: '', retakeScore: '', rebuildScore: '',
          college: '', remark: '', retakeFlag: '', englishName: '',
        };
        if (entry.name && entry.code) {
          const result = GradeEntrySchema.safeParse(entry);
          if (result.success) entries.push(result.data);
        }
      }
    }
  } else {
    // Standard grade table: Datagrid1 with 16 columns
    const gradeTable = doc.getElementById('Datagrid1') as HTMLTableElement | null;
    if (gradeTable) {
      const rows = Array.from(gradeTable.querySelectorAll('tr'));
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'));
        if (cells.length < 14) continue;
        const entry = {
          year: cellText(cells[0]), semester: cellText(cells[1]),
          code: cellText(cells[2]), name: cellText(cells[3]),
          category: cellText(cells[4]), attribution: cellText(cells[5]),
          credits: cellText(cells[6]), gradePoint: cellText(cells[7]),
          score: cellText(cells[8]), minorFlag: cellText(cells[9]),
          retakeScore: cellText(cells[10]), rebuildScore: cellText(cells[11]),
          college: cellText(cells[12]), remark: cellText(cells[13]),
          retakeFlag: cellText(cells[14]), englishName: cellText(cells[15]),
        };
        if (entry.name) {
          const result = GradeEntrySchema.safeParse(entry);
          if (result.success) entries.push(result.data);
        }
      }
    }
  }

  // Category summary: Datagrid2
  const catTable = doc.getElementById('Datagrid2') as HTMLTableElement | null;
  const categorySummary: z.infer<typeof CategorySummarySchema>[] = [];
  if (catTable) {
    const rows = Array.from(catTable.querySelectorAll('tr'));
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));
      if (cells.length < 5) continue;
      categorySummary.push({
        name: cellText(cells[0]), creditRequired: cellText(cells[1]),
        creditEarned: cellText(cells[2]), creditFailed: cellText(cells[3]),
        creditNeeded: cellText(cells[4]),
      });
    }
  }

  // Attribution summary: DataGrid6
  const attrTable = doc.getElementById('DataGrid6') as HTMLTableElement | null;
  const attributionSummary: z.infer<typeof CategorySummarySchema>[] = [];
  if (attrTable) {
    const rows = Array.from(attrTable.querySelectorAll('tr'));
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));
      if (cells.length < 5) continue;
      attributionSummary.push({
        name: cellText(cells[0]), creditRequired: cellText(cells[1]),
        creditEarned: cellText(cells[2]), creditFailed: cellText(cells[3]),
        creditNeeded: cellText(cells[4]),
      });
    }
  }

  // Year summary: DataGrid7
  const yearTable = doc.getElementById('DataGrid7') as HTMLTableElement | null;
  const yearSummary: { year: string; semester: string; earned: string; failedCourses: string; failedCredits: string; warning: string }[] = [];
  if (yearTable) {
    const rows = Array.from(yearTable.querySelectorAll('tr'));
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));
      if (cells.length < 6) continue;
      yearSummary.push({
        year: cellText(cells[0]), semester: cellText(cells[1]),
        earned: cellText(cells[2]), failedCourses: cellText(cells[3]),
        failedCredits: cellText(cells[4]), warning: cellText(cells[5]),
      });
    }
  }

  // Failed courses: Datagrid3 (only in non-max modes; in max mode Datagrid3 IS the main table)
  const failedCourses: { code: string; name: string; credits: string; category: string; maxScore: string; attribution: string }[] = [];
  if (queryMode !== 'max') {
    const failedTable = doc.getElementById('Datagrid3') as HTMLTableElement | null;
    if (failedTable) {
      const rows = Array.from(failedTable.querySelectorAll('tr'));
      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'));
        if (cells.length < 6) continue;
        failedCourses.push({
          code: cellText(cells[0]), name: cellText(cells[1]),
          credits: cellText(cells[2]), category: cellText(cells[3]),
          maxScore: cellText(cells[4]), attribution: cellText(cells[5]),
        });
      }
    }
  }

  // GPA and ranking
  const gpaMatch = bodyText.match(/平均学分绩点[：:]\s*([\d.]+)/);
  const sumMatch = bodyText.match(/学分绩点总和[：:]\s*([\d.]+)/);
  const rankMatch = bodyText.match(/本专业共(\d+)人/);
  const gpaText = [
    gpaMatch ? `平均学分绩点：${gpaMatch[1]}` : '',
    sumMatch ? `学分绩点总和：${sumMatch[1]}` : '',
    rankMatch ? `本专业共${rankMatch[1]}人` : '',
  ].filter(Boolean).join('；');
  const rankingText = gpaText;

  return GradeDataSchema.parse({
    studentInfo: { xh, name, college, major, className },
    semesterInfo: { year, yearText, semester, semesterText },
    headerText,
    queryMode,
    creditStats,
    entries,
    categorySummary,
    attributionSummary,
    yearSummary,
    gpaText,
    rankingText,
    failedCourses,
  });
}
