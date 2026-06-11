import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseSchedule,
  parseStudentInfo,
  parseSemesterInfo,
  parseAdjustments,
  parsePracticalCourses,
  parseUnscheduledCourses,
  parseScheduleData,
} from './parser';

describe('parseSchedule — cancelled course detection', () => {
  function buildScheduleCell(html: string): HTMLTableElement {
    document.body.innerHTML = '';
    const table = document.createElement('table');
    table.id = 'Table1';

    // Row 0: header
    let tr = document.createElement('tr');
    ['时间', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'].forEach(h => {
      const th = document.createElement('td');
      th.textContent = h;
      tr.appendChild(th);
    });
    table.appendChild(tr);

    // Row 1: placeholder until "第1节" row
    tr = document.createElement('tr');
    const td0 = document.createElement('td');
    td0.colSpan = 2;
    td0.textContent = '第1节';
    tr.appendChild(td0);
    // Monday cell (column index 2)
    const td2 = document.createElement('td');
    td2.align = 'Center';
    td2.innerHTML = html;
    tr.appendChild(td2);
    // Fill remaining columns
    for (let i = 0; i < 6; i++) {
      const td = document.createElement('td');
      td.align = 'Center';
      td.innerHTML = '&nbsp;';
      tr.appendChild(td);
    }
    table.appendChild(tr);

    document.body.appendChild(table);
    return table;
  }

  it('parses a normal course', () => {
    buildScheduleCell('数字电路<br>周一第1,2节{第1-17周}<br>张晶<br>教3－410');
    const courses = parseSchedule();
    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe('数字电路');
    expect(courses[0].teacher).toBe('张晶');
    expect(courses[0].location).toBe('教3－410');
    expect(courses[0].day).toBe(1);
    expect(courses[0].startWeek).toBe(1);
    expect(courses[0].endWeek).toBe(17);
    expect(courses[0].weekType).toBe('all');
    expect(courses[0].slots).toEqual([1, 2]);
  });

  it('parses all courses and skips cancel marker placeholder blocks', () => {
    // (停) markers REPLACE cancelled course entries — they are placeholders, not annotations.
    // All other entries are still active courses.
    buildScheduleCell(
      '正常课程A<br>周一第1,2节{第1-17周}<br>张晶<br>教3－410' +
      '<br><br><font color="red">(停0115)</font><br><br>' +
      '正常课程B<br>周一第3,4节{第2-4周|双周}<br>吴冰灵<br>教3－410'
    );
    const courses = parseSchedule();
    // Both courses should be parsed — cancel marker is a placeholder between them
    expect(courses).toHaveLength(2);
    expect(courses[0].name).toBe('正常课程A');
    expect(courses[1].name).toBe('正常课程B');
  });

  it('handles multiple cancel markers between courses', () => {
    buildScheduleCell(
      '正常课程A<br>周一第1,2节{第1-17周}<br>张晶<br>教3－410' +
      '<br><br><font color="red">(停0115)</font><br><br>' +
      '正常课程B<br>周一第3,4节{第2-4周|双周}<br>吴冰灵<br>教3－410' +
      '<br><br><font color="red">(停0115)</font><br><br>' +
      '正常课程C<br>周一第8,9节{第8-16周|双周}<br>吴冰灵<br>教3－410'
    );
    const courses = parseSchedule();
    expect(courses).toHaveLength(3);
    expect(courses[0].name).toBe('正常课程A');
    expect(courses[1].name).toBe('正常课程B');
    expect(courses[2].name).toBe('正常课程C');
  });

  it('handles real-world format with cancel markers as placeholders', () => {
    // Real NJUPT page: cancel markers replace specific cancelled week slots
    buildScheduleCell(
      '数字电路与逻辑设计B<br>周四第3,4节{第1-17周|单周}<br>张晶<br>教3－410' +
      '<br><br><font color="red">(停0115)</font><br><br>' +
      '概率论与数理统计<br>周四第3,4节{第2-4周|双周}<br>吴冰灵<br>教3－410' +
      '<br><br><font color="red">(停0115)</font><br><br>' +
      '概率论与数理统计<br>周四第3,4节{第8-16周|双周}<br>吴冰灵<br>教3－410'
    );
    const courses = parseSchedule();
    // All 3 courses survive — cancel markers are standalone placeholders
    expect(courses).toHaveLength(3);
    expect(courses[0].name).toBe('数字电路与逻辑设计B');
    expect(courses[1].name).toBe('概率论与数理统计');
    expect(courses[2].name).toBe('概率论与数理统计');
  });

  it('handles trailing cancel marker', () => {
    buildScheduleCell(
      '正常A<br>周一第1,2节{第1-17周}<br>师A<br>教室A' +
      '<br><br><font color="red">(停0115)</font>'
    );
    const courses = parseSchedule();
    expect(courses).toHaveLength(1);
    expect(courses[0].name).toBe('正常A');
  });

  it('detects odd/even week type', () => {
    buildScheduleCell('实验课<br>周五第1,2节{第5-17周|单周}<br>王艳<br>实验室');
    const courses = parseSchedule();
    expect(courses).toHaveLength(1);
    expect(courses[0].weekType).toBe('单');
  });

  it('returns empty for empty table', () => {
    document.body.innerHTML = '';
    const courses = parseSchedule();
    expect(courses).toHaveLength(0);
  });
});

describe('parseStudentInfo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts student info from page text', () => {
    document.body.textContent = '学号：B24040213 | 姓名：测试用户 | 学院：计算机学院 | 专业：计算机科学与技术 | 行政班：B240402';
    const info = parseStudentInfo();
    expect(info.xh).toBe('B24040213');
    expect(info.name).toBe('测试用户');
    expect(info.college).toBe('计算机学院');
    expect(info.major).toBe('计算机科学与技术');
    expect(info.className).toBe('B240402');
  });

  it('strips trailing pipe separators from student info fields', () => {
    // Real page text has ` | ` separators between fields
    document.body.textContent = '姓名：测试用户 | 学院：计算机学院 | 专业：计算机科学与技术 |';
    const info = parseStudentInfo();
    expect(info.name).toBe('测试用户');
    expect(info.college).toBe('计算机学院');
    expect(info.major).toBe('计算机科学与技术');
  });

  it('returns empty strings when info not found', () => {
    document.body.textContent = 'No student info here';
    const info = parseStudentInfo();
    expect(info.xh).toBe('');
    expect(info.name).toBe('');
  });
});

describe('parseSemesterInfo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts semester from select elements', () => {
    const xnd = document.createElement('select');
    xnd.id = 'xnd';
    xnd.innerHTML = '<option value="2026-2027">2026-2027</option><option value="2025-2026" selected>2025-2026</option>';
    document.body.appendChild(xnd);

    const xqd = document.createElement('select');
    xqd.id = 'xqd';
    xqd.innerHTML = '<option value="1">1</option><option value="2" selected>2</option>';
    document.body.appendChild(xqd);

    const info = parseSemesterInfo();
    expect(info.year).toBe('2025-2026');
    expect(info.yearText).toBe('2025-2026');
    expect(info.semester).toBe('2');
    expect(info.semesterText).toBe('2');
  });

  it('returns empty strings when selects missing', () => {
    const info = parseSemesterInfo();
    expect(info.year).toBe('');
    expect(info.semester).toBe('');
  });
});

describe('parseAdjustments', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses adjustment table rows', () => {
    const table = document.createElement('table');
    table.id = 'DBGrid';
    const header = document.createElement('tr');
    ['编号', '课程名称', '原安排', '现安排', '时间'].forEach(h => {
      const th = document.createElement('td');
      th.textContent = h;
      header.appendChild(th);
    });
    table.appendChild(header);

    const row = document.createElement('tr');
    ['停0115', '概率论与数理统计', '周4第3节连续2节{第6-6周双周}/教3－410/吴冰灵', '', '2026-04-06-18-03'].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      row.appendChild(td);
    });
    table.appendChild(row);
    document.body.appendChild(table);

    const adj = parseAdjustments();
    expect(adj).toHaveLength(1);
    expect(adj[0].id).toBe('停0115');
    expect(adj[0].courseName).toBe('概率论与数理统计');
  });

  it('returns empty when table missing', () => {
    expect(parseAdjustments()).toHaveLength(0);
  });
});

describe('parsePracticalCourses', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses practical courses from DataGrid1 inside Table3', () => {
    const t3 = document.createElement('div');
    t3.id = 'Table3';
    const dg = document.createElement('table');
    dg.id = 'DataGrid1';
    dg.className = 'datelist';
    const header = document.createElement('tr');
    ['课程名称', '教师', '学分', '起止周', '时间', '地点'].forEach(h => {
      const th = document.createElement('td');
      th.textContent = h;
      header.appendChild(th);
    });
    dg.appendChild(header);
    const row = document.createElement('tr');
    ['认识实习', '徐鹤', '0.5', '09-09', '', ''].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      row.appendChild(td);
    });
    dg.appendChild(row);
    t3.appendChild(dg);
    document.body.appendChild(t3);

    const pc = parsePracticalCourses();
    expect(pc).toHaveLength(1);
    expect(pc[0].name).toBe('认识实习');
    expect(pc[0].teacher).toBe('徐鹤');
  });
});

describe('parseUnscheduledCourses', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses unscheduled courses from Datagrid2', () => {
    const table = document.createElement('table');
    table.id = 'Datagrid2';
    const header = document.createElement('tr');
    ['学年', '学期', '课程名称', '教师姓名', '学分'].forEach(h => {
      const th = document.createElement('td');
      th.textContent = h;
      header.appendChild(th);
    });
    table.appendChild(header);
    const row = document.createElement('tr');
    ['2025-2026', '2', '数字时代的市场营销（在线）', '闻超群', '1.0'].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      row.appendChild(td);
    });
    table.appendChild(row);
    document.body.appendChild(table);

    const uc = parseUnscheduledCourses();
    expect(uc).toHaveLength(1);
    expect(uc[0].name).toBe('数字时代的市场营销（在线）');
    expect(uc[0].credits).toBe('1.0');
  });
});

describe('parseScheduleData', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('combines all parsers into schedule data', () => {
    // Setup student info
    document.body.textContent = '学号：B24040213 | 姓名：测试用户 | 学院：计算机学院 | 专业：计算机科学与技术 | 行政班：B240402';

    // Semester selects
    const xnd = document.createElement('select');
    xnd.id = 'xnd';
    xnd.innerHTML = '<option value="2025-2026" selected>2025-2026</option>';
    document.body.appendChild(xnd);
    const xqd = document.createElement('select');
    xqd.id = 'xqd';
    xqd.innerHTML = '<option value="2" selected>2</option>';
    document.body.appendChild(xqd);

    const data = parseScheduleData();
    expect(data.studentInfo.xh).toBe('B24040213');
    expect(data.semesterInfo.year).toBe('2025-2026');
    expect(data.courses).toEqual([]);
    expect(data.adjustments).toEqual([]);
    expect(data.practicalCourses).toEqual([]);
    expect(data.unscheduledCourses).toEqual([]);
  });
});
