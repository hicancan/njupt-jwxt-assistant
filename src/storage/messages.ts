import type { CaptureJob, NormalizedSchedule } from '../contracts/model';

export type StorageRequest =
  | { type: 'storage:get-snapshot' }
  | { type: 'storage:put-job'; job: CaptureJob }
  | { type: 'storage:put-result'; result: NormalizedSchedule }
  | { type: 'storage:clear' };

export interface StorageSnapshot {
  job: CaptureJob | null;
  results: NormalizedSchedule[];
}
