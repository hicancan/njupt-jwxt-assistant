import { describe, it, expect } from 'vitest';
import { exportJSON, exportMarkdown } from './exporter';
import type { ScheduleData } from './parser';

function makeScheduleData(overrides?: Partial<ScheduleData>): ScheduleData {
  return {
    studentInfo: {
      xh: 'B24040213',
      name: '测试用户',
      college: '计算机学院',
      major: '计算机科学与技术',
      className: 'B240402',
    },
    semesterInfo: {
      year: '2025-2026',
      yearText: '2025-2026',
      semester: '2',
      semesterText: '2',
    },
    courses: [
      {
        name: '数字电路与逻辑设计B',
        teacher: '张晶',
        location: '教3－410',
        day: 1,
        startWeek: 1,
        endWeek: 17,
        weekType: 'all',
        slots: [1, 2],
      },
      {
        name: '算法分析与设计',
        teacher: '王煜尧',
        location: '教3－409',
        day: 4,
        startWeek: 1,
        endWeek: 17,
        weekType: 'all',
        slots: [1, 2],
      },
      {
        name: '形势与政策IV',
        teacher: '陶新宏',
        location: '教3－101',
        day: 3,
        startWeek: 6,
        endWeek: 8,
        weekType: 'all',
        slots: [10, 11, 12],
      },
    ],
    adjustments: [
      {
        id: '停0115',
        courseName: '概率论与数理统计',
        originalSchedule: '周4第3节连续2节{第6-6周双周}/教3－410/吴冰灵',
        newSchedule: '',
        applyTime: '2026-04-06-18-03',
      },
    ],
    practicalCourses: [
      {
        name: '认识实习',
        teacher: '徐鹤',
        credits: '0.5',
        weeks: '09-09',
        time: '',
        location: '',
      },
    ],
    unscheduledCourses: [
      {
        year: '2025-2026',
        semester: '2',
        name: '数字时代的市场营销（在线）',
        teacher: '闻超群',
        credits: '1.0',
      },
    ],
    ...overrides,
  };
}

describe('exportJSON', () => {
  it('produces valid JSON with all sections', () => {
    const data = makeScheduleData();
    const json = exportJSON(data);
    const parsed = JSON.parse(json);

    expect(parsed.studentInfo.name).toBe('测试用户');
    expect(parsed.studentInfo.xh).toBe('B24040213');
    expect(parsed.semesterInfo.year).toBe('2025-2026');
    expect(parsed.courses).toHaveLength(3);
    expect(parsed.courses[0].name).toBe('数字电路与逻辑设计B');
    expect(parsed.courses[0].slots).toEqual([1, 2]);
    expect(parsed.adjustments).toHaveLength(1);
    expect(parsed.adjustments[0].id).toBe('停0115');
    expect(parsed.practicalCourses).toHaveLength(1);
    expect(parsed.unscheduledCourses).toHaveLength(1);
  });

  it('handles empty arrays', () => {
    const data = makeScheduleData({ courses: [], adjustments: [], practicalCourses: [], unscheduledCourses: [] });
    const json = exportJSON(data);
    const parsed = JSON.parse(json);

    expect(parsed.courses).toHaveLength(0);
    expect(parsed.adjustments).toHaveLength(0);
  });
});

describe('exportMarkdown', () => {
  it('contains student info section', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('# 南邮课表');
    expect(md).toContain('测试用户');
    expect(md).toContain('B24040213');
    expect(md).toContain('计算机学院');
    expect(md).toContain('计算机科学与技术');
    expect(md).toContain('B240402');
  });

  it('contains semester and start date info', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('2025-2026');
    expect(md).toContain('2026-02-17');
  });

  it('contains weekly schedule table', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('## 周课表');
    expect(md).toContain('| 节次 | 周一 | 周二 | 周三 | 周四 | 周五 | 周六 | 周日 |');
    expect(md).toContain('数字电路与逻辑设计B');
    expect(md).toContain('张晶');
  });

  it('contains course detail list with sorted courses', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('## 课程详情');
    expect(md).toContain('算法分析与设计');
    expect(md).toContain('形势与政策IV');
    expect(md).toContain('10,11,12'); // 3-slot course
  });

  it('contains adjustments section', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('## 调、停（补）课信息');
    expect(md).toContain('停0115');
    expect(md).toContain('概率论与数理统计');
  });

  it('contains practical courses section', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('## 实践课');
    expect(md).toContain('认识实习');
    expect(md).toContain('徐鹤');
    expect(md).toContain('0.5');
  });

  it('contains unscheduled courses section', () => {
    const data = makeScheduleData();
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('## 未安排上课时间的课程');
    expect(md).toContain('数字时代的市场营销（在线）');
    expect(md).toContain('闻超群');
    expect(md).toContain('1.0');
  });

  it('omits empty sections', () => {
    const data = makeScheduleData({ adjustments: [], practicalCourses: [], unscheduledCourses: [] });
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).not.toContain('## 调、停（补）课信息');
    expect(md).not.toContain('## 实践课');
    expect(md).not.toContain('## 未安排上课时间的课程');
  });

  it('includes odd/even week markers', () => {
    const data = makeScheduleData({
      courses: [{
        name: '实验课', teacher: '王艳', location: '实验室',
        day: 5, startWeek: 5, endWeek: 17, weekType: '单', slots: [1, 2],
      }],
      adjustments: [],
      practicalCourses: [],
      unscheduledCourses: [],
    });
    const md = exportMarkdown(data, '2026-02-17');

    expect(md).toContain('单周');
  });
});
