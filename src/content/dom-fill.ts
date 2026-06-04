import type { FillAction } from './eval-strategy';
import { getEvalDocument } from './dom-analyzer';

function getDoc(): Document {
  return getEvalDocument();
}

/**
 * Apply fill actions to the DOM: set each select to the specified value.
 * Automatically operates on the evaluation document (top-level or iframe).
 */
export function applyFillActions(actions: FillAction[]): void {
  const doc = getDoc();
  for (const action of actions) {
    const el = doc.getElementById(action.selectId) as HTMLSelectElement | null;
    if (!el) {
      throw new Error(`未找到元素: ${action.selectId}`);
    }

    el.value = action.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function writeComment(textareaId: string, text: string): void {
  const doc = getDoc();
  const el = doc.getElementById(textareaId) as HTMLTextAreaElement | null;
  if (!el) {
    throw new Error(`未找到评语框: ${textareaId}`);
  }
  el.value = text;
}

export function clickSave(buttonId: string): void {
  const doc = getDoc();
  const el = doc.getElementById(buttonId) as HTMLInputElement | null;
  if (!el) {
    throw new Error(`未找到保存按钮: ${buttonId}`);
  }
  el.click();
}

export function clickSubmit(buttonId: string): void {
  const doc = getDoc();
  const el = doc.getElementById(buttonId) as HTMLInputElement | null;
  if (!el) {
    throw new Error(`未找到提交按钮: ${buttonId}`);
  }
  el.click();
}

export function selectCourse(courseIndex: number): void {
  const doc = getDoc();
  const pjkc = doc.getElementById('pjkc') as HTMLSelectElement | null;
  if (!pjkc) {
    throw new Error('未找到课程选择器');
  }

  if (courseIndex < 0 || courseIndex >= pjkc.options.length) {
    throw new Error(`课程索引越界: ${courseIndex} / ${pjkc.options.length}`);
  }

  pjkc.selectedIndex = courseIndex;

  const win = doc.defaultView as any;
  if (typeof win?.__doPostBack === 'function') {
    win.__doPostBack('pjkc', '');
  } else {
    pjkc.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
