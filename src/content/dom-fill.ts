import type { FillAction } from './eval-strategy';
import { getEvalDocument } from './dom-analyzer';

function el<T extends HTMLElement>(id: string): T {
  const e = getEvalDocument().getElementById(id) as T | null;
  if (!e) throw new Error(`未找到元素: ${id}`);
  return e;
}

export function applyFillActions(actions: FillAction[]): void {
  for (const a of actions) {
    const s = el<HTMLSelectElement>(a.selectId);
    s.value = a.value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

export function writeComment(textareaId: string, text: string): void {
  el<HTMLTextAreaElement>(textareaId).value = text;
}

export function clickSave(buttonId: string): void {
  el<HTMLInputElement>(buttonId).click();
}

export function selectCourse(courseIndex: number): void {
  const pjkc = el<HTMLSelectElement>('pjkc');
  if (courseIndex < 0 || courseIndex >= pjkc.options.length) {
    throw new Error(`课程索引越界: ${courseIndex} / ${pjkc.options.length}`);
  }
  pjkc.selectedIndex = courseIndex;

  const win = pjkc.ownerDocument.defaultView as any;
  if (typeof win?.__doPostBack === 'function') {
    win.__doPostBack('pjkc', '');
  } else {
    pjkc.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
