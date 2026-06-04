import type { TeacherGroup } from '../lib/types';

export interface FillAction {
  selectId: string;
  value: string;
}

/**
 * Detect the best and good option values from the first select's options.
 * Index 1 = best (完全认同 / 好), Index 2 = good (相对认同 / 较好).
 * Falls back to "完全认同"/"相对认同" if can't detect.
 */
function detectOptionValues(group: TeacherGroup): { best: string; good: string } {
  const firstSelect = group.selects[0];
  if (firstSelect && firstSelect.options.length >= 3) {
    return {
      best: firstSelect.options[1]?.value || '完全认同',
      good: firstSelect.options[2]?.value || '相对认同',
    };
  }
  return { best: '完全认同', good: '相对认同' };
}

/**
 * For each teacher: randomly pick 1 question as "good" (较好/相对认同),
 * the rest as "best" (好/完全认同).
 *
 * Auto-detects the rating scale from the page's select options,
 * works for both 满意度调查 and 教学评价.
 */
export function computeFillActions(groups: TeacherGroup[]): FillAction[] {
  const actions: FillAction[] = [];

  for (const group of groups) {
    const { selects } = group;
    if (selects.length === 0) continue;

    const { best, good } = detectOptionValues(group);

    // Single select → always best
    if (selects.length === 1) {
      actions.push({ selectId: selects[0].id, value: best });
      continue;
    }

    const randomIdx = Math.floor(Math.random() * selects.length);

    for (let i = 0; i < selects.length; i++) {
      actions.push({
        selectId: selects[i].id,
        value: i === randomIdx ? good : best,
      });
    }
  }

  return actions;
}
