import { describe, it, expect } from 'vitest';
import { computeFillActions } from './eval-strategy';
import type { TeacherGroup, EvalSelect, EvalOption } from '../lib/types';

function makeOption(text: string, idx: number): EvalOption {
  return { index: idx, text, value: text };
}

/** Satisfaction survey options */
function makeSelectSatisfaction(id: string): EvalSelect {
  return {
    id, name: id,
    options: [
      makeOption('', 0), makeOption('完全认同', 1), makeOption('相对认同', 2),
      makeOption('勉强认同', 3), makeOption('不太认同', 4), makeOption('完全不认同', 5),
    ],
  };
}

/** Teaching evaluation options */
function makeSelectTeaching(id: string): EvalSelect {
  return {
    id, name: id,
    options: [
      makeOption('', 0), makeOption('好', 1), makeOption('较好', 2),
      makeOption('一般', 3), makeOption('较差', 4), makeOption('差', 5),
    ],
  };
}

describe('computeFillActions — 满意度调查', () => {
  it('fills all with 完全认同 except one 相对认同 per teacher', () => {
    const groups: TeacherGroup[] = [{
      teacherKey: 'JS1',
      selects: [makeSelectSatisfaction('s1'), makeSelectSatisfaction('s2'), makeSelectSatisfaction('s3')],
    }];
    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(3);
    expect(actions.filter(a => a.value === '完全认同')).toHaveLength(2);
    expect(actions.filter(a => a.value === '相对认同')).toHaveLength(1);
  });

  it('single select → always best', () => {
    const groups: TeacherGroup[] = [{ teacherKey: 'JS1', selects: [makeSelectSatisfaction('s1')] }];
    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(1);
    expect(actions[0].value).toBe('完全认同');
  });

  it('multi-teacher, 1 good per teacher', () => {
    const groups: TeacherGroup[] = [
      { teacherKey: 'JS1', selects: [makeSelectSatisfaction('a1'), makeSelectSatisfaction('a2')] },
      { teacherKey: 'JS2', selects: [makeSelectSatisfaction('b1'), makeSelectSatisfaction('b2')] },
    ];
    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(4);
    const js1 = actions.filter(a => a.selectId.includes('a'));
    const js2 = actions.filter(a => a.selectId.includes('b'));
    expect(js1.filter(a => a.value === '相对认同')).toHaveLength(1);
    expect(js1.filter(a => a.value === '完全认同')).toHaveLength(1);
    expect(js2.filter(a => a.value === '相对认同')).toHaveLength(1);
    expect(js2.filter(a => a.value === '完全认同')).toHaveLength(1);
  });
});

describe('computeFillActions — 教学评价 (auto-detect scale)', () => {
  it('uses 好/较好 scale automatically', () => {
    const groups: TeacherGroup[] = [{
      teacherKey: 'JS1',
      selects: [makeSelectTeaching('s1'), makeSelectTeaching('s2'), makeSelectTeaching('s3')],
    }];
    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(3);
    expect(actions.filter(a => a.value === '好')).toHaveLength(2);
    expect(actions.filter(a => a.value === '较好')).toHaveLength(1);
  });

  it('single select → always 好', () => {
    const groups: TeacherGroup[] = [{ teacherKey: 'JS1', selects: [makeSelectTeaching('s1')] }];
    const actions = computeFillActions(groups);
    expect(actions).toHaveLength(1);
    expect(actions[0].value).toBe('好');
  });
});

describe('computeFillActions — edge cases', () => {
  it('returns empty for empty groups', () => {
    expect(computeFillActions([])).toHaveLength(0);
  });
});
