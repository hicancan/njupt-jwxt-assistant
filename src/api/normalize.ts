import type {
  CatalogDescriptor,
  NormalizedSchedule,
  ScheduleRecord,
  TermSelection,
  WeekDefinition,
} from '../contracts/model';

const SENSITIVE_KEYS = /^(userModel|queryModel|cookie|token|password|phone|mobile|sjh|lxdh|email)$/i;
const SENSITIVE_VALUE = /(?:password|token|密码|口令|会议号|https?:\/\/|\b1[3-9]\d{9}\b)/i;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必须是对象`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`);
  return value;
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function integer(value: unknown): number | null {
  const normalized = text(value);
  if (normalized === null) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function decimal(value: unknown): number | null {
  const normalized = text(value);
  if (normalized === null) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function strings(value: unknown): string[] {
  const normalized = text(value);
  return normalized
    ? [...new Set(normalized.split(/[;,，；]/).map((item) => item.trim()).filter(Boolean))].sort()
    : [];
}

function weekNumbers(value: unknown): number[] {
  const normalized = text(value);
  if (!normalized) return [];
  return [...new Set((normalized.match(/\d+/g) ?? []).map(Number).filter((week) => week >= 1 && week <= 60))].sort(
    (left, right) => left - right,
  );
}

function safePublicNote(value: unknown): string | null {
  const normalized = text(value);
  return normalized && !SENSITIVE_VALUE.test(normalized) ? normalized : null;
}

function normalizeRecord(value: unknown): ScheduleRecord {
  const record = object(value, '课表记录');
  const courseName = text(record.kcmc);
  if (!courseName) throw new Error('课表记录缺少课程名称');
  return {
    course_code: text(record.kch),
    course_name: courseName,
    weekday: integer(record.xqj),
    weekday_label: text(record.xqjmc),
    period_label: text(record.jc),
    periods: text(record.jcs ?? record.jcor ?? record.xsdj),
    week_label: text(record.zcd),
    week_numbers: weekNumbers(record.zcds ?? record.zcd),
    room_id: text(record.cd_id),
    location: text(record.cdmc),
    location_type: text(record.cdlbmc),
    teacher: text(record.xm),
    teacher_title: text(record.zcmc),
    teaching_class_id: text(record.jxb_id),
    teaching_class_name: text(record.jxbmc),
    teaching_class_composition: strings(record.jxbzc),
    direction_id: text(record.zyfx_id) === 'wfx' ? null : text(record.zyfx_id),
    direction: text(record.zyfxmc) === '无方向' ? null : text(record.zyfxmc),
    course_category: text(record.kclbmc),
    course_nature: text(record.kcxzjc),
    teaching_class_size: integer(record.jxbrs),
    enrollment_count: integer(record.xkrs),
    assessment_method: text(record.khfsmc),
    enrollment_note: safePublicNote(record.xkbz),
    class_hours_composition: text(record.kcxszc),
    online_information: safePublicNote(record.zxxx),
    total_hours: decimal(record.zxs),
    credits: decimal(record.xf),
    capacity: integer(record.zzrl),
    campus_id: text(record.xqh_id),
    campus: text(record.xqmc),
    teaching_method: text(record.skfsmc),
    instructor_role: text(record.zfjmc),
    course_total_hours: decimal(record.kczxs),
    exam_method: text(record.ksfsmc),
    weekly_hours: decimal(record.zhxs),
    scheduling_flag: text(record.pkbj),
  };
}

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (!SENSITIVE_KEYS.test(key)) result[key] = scrub(item);
    }
    return result;
  }
  return value;
}

export function normalizeCatalogResponse(value: unknown, term: TermSelection): CatalogDescriptor[] {
  const response = object(value, '课表目录响应');
  const items = array(response.items, '课表目录 items');
  const declaredTotal = integer(response.totalResult);
  if (declaredTotal !== null && declaredTotal !== items.length) {
    throw new Error(`课表目录不完整：声明 ${declaredTotal} 条，实际 ${items.length} 条`);
  }
  const descriptors = items.map((item, index) => {
    const raw = object(item, `课表目录第 ${index + 1} 项`);
    const descriptorId = text(raw.id) ?? `${term.internal_year_code}-${term.internal_term_code}-${index + 1}`;
    const classId = text(raw.bh_id) ?? '';
    const name = text(raw.tjkbmc ?? raw.bjmc) ?? classId;
    if (!name) throw new Error(`课表目录第 ${index + 1} 项缺少名称`);
    return {
      descriptor_id: descriptorId,
      class_id: classId,
      name,
      campus_id: text(raw.xqh_id),
      campus: text(raw.xqmc),
      grade: text(raw.njdm_id ?? raw.njmc),
      college_id: text(raw.jgdm ?? raw.jg_id),
      college: text(raw.jgmc),
      major_id: text(raw.zyh_id),
      major: text(raw.zymc),
      direction_id: text(raw.zyfx_id),
      direction: text(raw.zyfxmc),
      level: text(raw.pyccdm),
      timetable_kind: text(raw.tjkbzdm) ?? '1',
      timetable_display: text(raw.tjkbzxsdm) ?? '0',
    } satisfies CatalogDescriptor;
  });
  return descriptors.sort((left, right) => left.descriptor_id.localeCompare(right.descriptor_id, 'zh-CN'));
}

export function normalizeScheduleResponse(
  descriptor: CatalogDescriptor,
  value: unknown,
): Omit<NormalizedSchedule, 'status' | 'error'> {
  const response = object(value, '班级课表响应');
  const allowed = new Set([
    'djdzList', 'jxhjkcList', 'kbList', 'kblx', 'lxfs', 'qsxqj', 'sfxsd', 'sjkList',
    'sxgykbbz', 'weekNum', 'xkkg', 'xqbzxxszList', 'xqjmcMap', 'xsbjList', 'zs',
  ]);
  const unknownKeys = Object.keys(response).filter((key) => !allowed.has(key));
  if (unknownKeys.length) throw new Error(`班级课表响应出现未知字段：${unknownKeys.join('、')}`);

  const meetings = [...array(response.kbList ?? [], 'kbList'), ...array(response.jxhjkcList ?? [], 'jxhjkcList')]
    .map(normalizeRecord)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'zh-CN'));
  const practiceNotes = array(response.sjkList ?? [], 'sjkList')
    .flatMap((item) => {
      const note = object(item, '实践课记录');
      return [text(note.sjkcgs), text(note.qtkcgs)].filter((entry): entry is string => Boolean(entry));
    });
  const weeks: WeekDefinition[] = array(response.weekNum ?? [], 'weekNum')
    .map((item) => {
      const week = object(item, '周次定义');
      const number = integer(week.zs ?? week.zsmc);
      const range = text(week.rq)?.split('/');
      if (!number || !range || range.length !== 2) throw new Error('周次定义缺少周号或日期范围');
      return { week: number, start_date: range[0], end_date: range[1] };
    })
    .sort((left, right) => left.week - right.week);
  const weekdayNames = object(response.xqjmcMap ?? {}, 'xqjmcMap');
  return {
    descriptor,
    meetings,
    practice_notes: [...new Set(practiceNotes)].sort((left, right) => left.localeCompare(right, 'zh-CN')),
    supplemental: {
      student_class_notes: scrub(array(response.xsbjList ?? [], 'xsbjList')) as unknown[],
      adjustments: scrub(array(response.djdzList ?? [], 'djdzList')) as unknown[],
      display_notes: scrub(array(response.xqbzxxszList ?? [], 'xqbzxxszList')) as unknown[],
    },
    weeks,
    weekday_names: Object.fromEntries(Object.entries(weekdayNames).map(([key, item]) => [key, String(item)])),
    first_weekday: integer(response.qsxqj),
  };
}

export function containsSensitiveKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveKeys);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, item]) => SENSITIVE_KEYS.test(key) || containsSensitiveKeys(item),
  );
}
