export const SOURCE_FORMAT = 'njupt-teaching-schedule-source' as const;

export type CaptureStatus = 'success' | 'empty' | 'special' | 'failed';

export interface TermSelection {
  academic_year: string;
  term_number: number;
  internal_year_code: string;
  internal_term_code: string;
}

export interface CatalogDescriptor {
  descriptor_id: string;
  class_id: string;
  name: string;
  campus_id: string | null;
  campus: string | null;
  grade: string | null;
  college_id: string | null;
  college: string | null;
  major_id: string | null;
  major: string | null;
  direction_id: string | null;
  direction: string | null;
  level: string | null;
  timetable_kind: string;
  timetable_display: string;
}

export interface WeekDefinition {
  week: number;
  start_date: string;
  end_date: string;
}

export interface PeriodDefinition {
  period: number;
  start_time: string;
  end_time: string;
  day_part: string;
}

export interface ScheduleRecord {
  course_code: string | null;
  course_name: string;
  weekday: number | null;
  weekday_label: string | null;
  period_label: string | null;
  periods: string | null;
  week_label: string | null;
  week_numbers: number[];
  room_id: string | null;
  location: string | null;
  location_type: string | null;
  teacher: string | null;
  teacher_title: string | null;
  teaching_class_id: string | null;
  teaching_class_name: string | null;
  teaching_class_composition: string[];
  direction_id: string | null;
  direction: string | null;
  course_category: string | null;
  course_nature: string | null;
  teaching_class_size: number | null;
  enrollment_count: number | null;
  assessment_method: string | null;
  enrollment_note: string | null;
  class_hours_composition: string | null;
  online_information: string | null;
  total_hours: number | null;
  credits: number | null;
  capacity: number | null;
  campus_id: string | null;
  campus: string | null;
  teaching_method: string | null;
  instructor_role: string | null;
  course_total_hours: number | null;
  exam_method: string | null;
  weekly_hours: number | null;
  scheduling_flag: string | null;
}

export interface NormalizedSchedule {
  descriptor: CatalogDescriptor;
  status: CaptureStatus;
  meetings: ScheduleRecord[];
  practice_notes: string[];
  supplemental: Record<string, unknown[]>;
  weeks: WeekDefinition[];
  weekday_names: Record<string, string>;
  first_weekday: number | null;
  error: string | null;
}

export interface CaptureProgress {
  total: number;
  completed: number;
  success: number;
  empty: number;
  special: number;
  failed: number;
  current: string | null;
}

export type JobLifecycle = 'idle' | 'running' | 'paused' | 'cancelled' | 'complete';

export interface CaptureJob {
  job_id: string;
  term: TermSelection;
  observed_at: string;
  lifecycle: JobLifecycle;
  catalog: CatalogDescriptor[];
  periods: PeriodDefinition[];
  progress: CaptureProgress;
  last_error: string | null;
}

export interface ArtifactReference {
  path: string;
  bytes: number;
  sha256: string;
}
