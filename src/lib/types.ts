import { z } from 'zod';

/** Page types the extension recognizes */
export type PageType = 'satisfaction' | 'teaching-eval' | 'dashboard' | 'schedule' | 'grade' | 'unknown';

/** A single Likert-scale select element on the evaluation page */
export interface EvalSelect {
  /** The select element id, e.g. "DataGrid1__ctl2_JS1" */
  id: string;
  /** The select element name, e.g. "DataGrid1:_ctl2:JS1" */
  name: string;
  /** Available options extracted from DOM */
  options: EvalOption[];
}

export interface EvalOption {
  index: number;
  text: string;
  value: string;
}

/** A course in the pjkc dropdown */
export interface Course {
  index: number;
  name: string;
  value: string;
}

/** Teacher grouping key = the JS{N} suffix from select name */
export interface TeacherGroup {
  teacherKey: string;
  /** All Likert selects belonging to this teacher */
  selects: EvalSelect[];
}

/** parsed evaluation page state */
export interface EvalPage {
  pageType: PageType;
  courses: Course[];
  currentCourseIndex: number;
  teacherGroups: TeacherGroup[];
  hasCommentBox: boolean;
  commentBoxId: string | null;
  saveButtonId: string | null;
  submitButtonId: string | null; // reserved for future auto-submit
}

/** Persisted settings schema */
export const EvalSettingsSchema = z.object({
  comment: z.string().max(50).default('老师教学认真，课堂气氛活跃，收获很大！'),
});

export type EvalSettings = z.infer<typeof EvalSettingsSchema>;

export const DEFAULT_EVAL_SETTINGS: EvalSettings = {
  comment: '老师教学认真，课堂气氛活跃，收获很大！',
};

/** Eval loop running state */
export type LoopStatus = 'idle' | 'running' | 'done' | 'error';

