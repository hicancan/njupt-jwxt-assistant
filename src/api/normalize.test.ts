import { describe, expect, it } from 'vitest';
import { containsSensitiveKeys, normalizeCatalogResponse, normalizeScheduleResponse } from './normalize';

const term = { academic_year: '2026-2027', term_number: 1, internal_year_code: '2026', internal_term_code: '3' };

describe('teaching schedule normalization', () => {
  it('normalizes catalog and rejects incomplete pagination', () => {
    expect(
      normalizeCatalogResponse({ totalResult: 1, items: [{ id: 'd1', bh_id: 'B1', tjkbmc: 'B1课表' }] }, term),
    ).toMatchObject([{ descriptor_id: 'd1', class_id: 'B1', name: 'B1课表' }]);
    expect(() => normalizeCatalogResponse({ totalResult: 2, items: [{}] }, term)).toThrow('不完整');
  });

  it('maps business fields and strips account data', () => {
    const descriptor = normalizeCatalogResponse(
      { totalResult: 1, items: [{ id: 'd1', bh_id: 'B1', tjkbmc: 'B1课表' }] }, term,
    )[0];
    const result = normalizeScheduleResponse(descriptor, {
      kbList: [{ kcmc: '数据结构', kch: 'C1', xqj: '1', jcs: '1-2', zcds: '1,3', jxbzc: 'B1;B2', userModel: { account: 'secret' } }],
      jxhjkcList: [], sjkList: [], weekNum: [{ zs: '1', rq: '2026-08-31/2026-09-06' }],
      xqjmcMap: { 1: '星期一' }, qsxqj: '1', xsbjList: [], djdzList: [], xqbzxxszList: [],
    });
    expect(result.meetings[0]).toMatchObject({ course_code: 'C1', week_numbers: [1, 3], teaching_class_composition: ['B1', 'B2'] });
    expect(containsSensitiveKeys(result)).toBe(false);
  });

  it('fails on an unknown response section', () => {
    const descriptor = normalizeCatalogResponse(
      { totalResult: 1, items: [{ id: 'd1', bh_id: 'B1', tjkbmc: 'B1课表' }] }, term,
    )[0];
    expect(() => normalizeScheduleResponse(descriptor, { kbList: [], mystery: [] })).toThrow('未知字段');
  });

  it('removes phone numbers, access secrets and links from public notes', () => {
    const descriptor = normalizeCatalogResponse(
      { totalResult: 1, items: [{ id: 'd1', bh_id: 'B1', tjkbmc: 'B1课表' }] }, term,
    )[0];
    const result = normalizeScheduleResponse(descriptor, {
      kbList: [{ kcmc: '数据结构', xkbz: '联系电话 13800138000', zxxx: '会议口令 1234 https://example.com' }],
      jxhjkcList: [], sjkList: [], weekNum: [], xqjmcMap: {}, xsbjList: [], djdzList: [], xqbzxxszList: [],
    });
    expect(result.meetings[0]).toMatchObject({ enrollment_note: null, online_information: null });
  });
});
