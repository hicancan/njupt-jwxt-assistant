import type { CaptureJob, NormalizedSchedule } from '../contracts/model';
import type { StorageRequest, StorageSnapshot } from './messages';

async function send<T>(request: StorageRequest): Promise<T> {
  const response = (await browser.runtime.sendMessage(request)) as { ok: true; value: T } | { ok: false; error: string };
  if (!response.ok) throw new Error(response.error);
  return response.value;
}

export const captureStorage = {
  getSnapshot: () => send<StorageSnapshot>({ type: 'storage:get-snapshot' }),
  putJob: (job: CaptureJob) => send<void>({ type: 'storage:put-job', job }),
  putResult: (result: NormalizedSchedule) => send<void>({ type: 'storage:put-result', result }),
  clear: () => send<void>({ type: 'storage:clear' }),
};
