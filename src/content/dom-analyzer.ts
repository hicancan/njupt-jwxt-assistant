import type { Course, EvalOption, EvalPage, EvalSelect, PageType, TeacherGroup } from '../lib/types';

/**
 * Find the iframe containing an evaluation page, if any.
 * NJUPT loads evaluation pages inside iframes on xs_main.aspx.
 */
export function findEvalIframe(): HTMLIFrameElement | null {
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      // Check src attribute first (static), then contentWindow (current URL after navigation)
      const src = (iframe as HTMLIFrameElement).src.toLowerCase();
      const cwUrl = (iframe as HTMLIFrameElement).contentWindow?.location.href.toLowerCase() || '';
      if (src.includes('xs_jsmydpj.aspx') || src.includes('xsjxpj.aspx') ||
          cwUrl.includes('xs_jsmydpj.aspx') || cwUrl.includes('xsjxpj.aspx')) {
        return iframe as HTMLIFrameElement;
      }
    } catch {
      // cross-origin or not loaded yet
    }
  }
  return null;
}

/**
 * Get the document to use for parsing — either the top-level document
 * or the evaluation iframe's document.
 */
export function getEvalDocument(): Document {
  const iframe = findEvalIframe();
  if (iframe?.contentDocument) {
    return iframe.contentDocument;
  }
  return document;
}

/**
 * Find the course selector (#pjkc) in the given document.
 */
export function findPjkcSelect(doc: Document = document): HTMLSelectElement | null {
  return doc.getElementById('pjkc') as HTMLSelectElement | null;
}

/**
 * Extract courses from the pjkc dropdown.
 */
export function getCourses(pjkc: HTMLSelectElement): Course[] {
  return Array.from(pjkc.options).map((opt, i) => ({
    index: i,
    name: opt.text.trim(),
    value: opt.value,
  }));
}

/**
 * Parse rating selects from the DataGrid table.
 * Matches: DataGrid1__ctl{N}_JS{M} or DataGrid1:_ctl{N}:JS{M}
 */
export function parseDataGridSelects(doc: Document = document): EvalSelect[] {
  const selects: EvalSelect[] = [];

  doc.querySelectorAll('select').forEach((sel) => {
    const htmlSel = sel as HTMLSelectElement;
    if (!htmlSel.id.includes('DataGrid1') || !htmlSel.id.includes('_JS')) {
      return;
    }

    const options: EvalOption[] = Array.from(htmlSel.options).map((opt, i) => ({
      index: i,
      text: opt.text.trim(),
      value: opt.value,
    }));

    selects.push({
      id: htmlSel.id,
      name: htmlSel.name,
      options,
    });
  });

  return selects;
}

/**
 * Group rating selects by teacher column suffix (JS1, JS2, ...).
 */
export function groupSelectsByTeacher(selects: EvalSelect[]): TeacherGroup[] {
  const groups = new Map<string, EvalSelect[]>();

  for (const sel of selects) {
    const match = sel.id.match(/(JS\d+)$/);
    const key = match ? match[1] : '__unknown__';

    const existing = groups.get(key);
    if (existing) {
      existing.push(sel);
    } else {
      groups.set(key, [sel]);
    }
  }

  return Array.from(groups.entries()).map(([teacherKey, selectList]) => ({
    teacherKey,
    selects: selectList,
  }));
}

export function findCommentBox(doc: Document = document): { id: string } | null {
  const el = doc.getElementById('pjxx') as HTMLTextAreaElement | null;
  if (el) return { id: el.id };
  return null;
}

export function findSaveButton(doc: Document = document): { id: string } | null {
  const el = doc.getElementById('Button1') as HTMLInputElement | null;
  if (el) return { id: el.id };
  return null;
}

export function findSubmitButton(doc: Document = document): { id: string } | null {
  const el = doc.getElementById('Button2') as HTMLInputElement | null;
  if (el) return { id: el.id };
  return null;
}

/**
 * Full parse of the evaluation page state.
 * Automatically detects iframe context.
 */
export function parseEvalPage(pageType: PageType): EvalPage {
  const doc = getEvalDocument();
  const pjkc = findPjkcSelect(doc);
  const courses: Course[] = pjkc ? getCourses(pjkc) : [];
  const currentCourseIndex = pjkc?.selectedIndex ?? 0;
  const selects = parseDataGridSelects(doc);
  const teacherGroups = groupSelectsByTeacher(selects);
  const commentBox = findCommentBox(doc);
  const saveBtn = findSaveButton(doc);
  const submitBtn = findSubmitButton(doc);

  return {
    pageType,
    courses,
    currentCourseIndex,
    teacherGroups,
    hasCommentBox: commentBox !== null,
    commentBoxId: commentBox?.id ?? null,
    saveButtonId: saveBtn?.id ?? null,
    submitButtonId: submitBtn?.id ?? null,
  };
}
