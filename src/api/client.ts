import type { CatalogDescriptor, PeriodDefinition, TermSelection } from '../contracts/model';
import { normalizeCatalogResponse, normalizeScheduleResponse } from './normalize';

const CATALOG_PATH = '/kbdy/bjkbdy_cxBjkbdyTjkbList.html?gnmkdm=N214505';
const SCHEDULE_PATH = '/kbdy/bjkbdy_cxBjKb.html?gnmkdm=N214505';

async function postForm(path: string, values: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams(values),
    credentials: 'include',
    signal,
  });
  if (!response.ok) throw new Error(`教务系统返回 HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('json')) {
    const body = await response.text();
    if (/login|登录|统一身份认证/i.test(body)) throw new Error('登录已失效，请重新登录后继续');
    throw new Error(`教务系统返回了非 JSON 内容：${contentType || '未知类型'}`);
  }
  return response.json();
}

export async function fetchCatalog(term: TermSelection, signal?: AbortSignal): Promise<CatalogDescriptor[]> {
  const data = await postForm(
    CATALOG_PATH,
    {
      xnm: term.internal_year_code,
      xqm: term.internal_term_code,
      xqh_id: '',
      njdm_id: '',
      jg_id: '',
      zyh_id: '',
      zyfx_id: '',
      bh_id: '',
      xsdm: '',
      pyccdm: '',
      'queryModel.showCount': '5000',
      'queryModel.currentPage': '1',
      'queryModel.sortName': '',
      'queryModel.sortOrder': 'asc',
    },
    signal,
  );
  return normalizeCatalogResponse(data, term);
}

export async function fetchSchedule(descriptor: CatalogDescriptor, term: TermSelection, signal?: AbortSignal) {
  const data = await postForm(
    SCHEDULE_PATH,
    {
      xnm: term.internal_year_code,
      xqm: term.internal_term_code,
      xnmc: term.academic_year,
      xqmmc: String(term.term_number),
      xqh_id: descriptor.campus_id ?? '',
      njdm_id: descriptor.grade ?? '',
      jg_id: descriptor.college_id ?? '',
      zyh_id: descriptor.major_id ?? '',
      zyfx_id: descriptor.direction_id ?? '',
      bh_id: descriptor.class_id,
      tjkbzdm: descriptor.timetable_kind,
      tjkbzxsdm: descriptor.timetable_display,
    },
    signal,
  );
  return normalizeScheduleResponse(descriptor, data);
}

export async function fetchPeriodDefinitions(term: TermSelection, signal?: AbortSignal): Promise<PeriodDefinition[]> {
  const data = await postForm(
    '/kbdy/bjkbdy_cxRjc.html',
    { xnm: term.internal_year_code, xqm: term.internal_term_code },
    signal,
  );
  if (!Array.isArray(data)) throw new Error('节次时间响应必须是数组');
  return data
    .map((value, index) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`第 ${index + 1} 条节次时间无效`);
      const record = value as Record<string, unknown>;
      const period = Number.parseInt(String(record.jcmc ?? ''), 10);
      const start = String(record.qssj ?? '').trim();
      const end = String(record.jssj ?? '').trim();
      const dayPart = String(record.rsdmc ?? '').trim();
      if (!Number.isInteger(period) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || !dayPart) {
        throw new Error(`第 ${index + 1} 条节次时间缺少必要字段`);
      }
      return { period, start_time: start, end_time: end, day_part: dayPart };
    })
    .sort((left, right) => left.period - right.period);
}

export function readCurrentTerm(documentRoot: Document = document): TermSelection {
  const select = (name: string) =>
    documentRoot.querySelector<HTMLSelectElement>(`select[name="${name}"]`) ??
    documentRoot.querySelector<HTMLSelectElement>(`#${name}`);
  const year = select('xnm');
  const term = select('xqm');
  if (!year?.value || !term?.value) throw new Error('没有找到当前学年和学期，请先打开班级课表查询页');
  const academicYear = year.selectedOptions[0]?.textContent?.trim();
  const termLabel = term.selectedOptions[0]?.textContent?.trim();
  const termNumber = Number.parseInt(termLabel ?? '', 10);
  if (!academicYear || !Number.isInteger(termNumber)) throw new Error('无法读取当前学年或学期');
  return {
    academic_year: academicYear,
    term_number: termNumber,
    internal_year_code: year.value,
    internal_term_code: term.value,
  };
}
