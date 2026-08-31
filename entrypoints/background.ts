import { clearDatabase, getSnapshot, putJob, putResult } from '../src/storage/database';
import type { StorageRequest } from '../src/storage/messages';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (request: StorageRequest) => {
    try {
      switch (request.type) {
        case 'storage:get-snapshot':
          return { ok: true as const, value: await getSnapshot() };
        case 'storage:put-job':
          await putJob(request.job);
          return { ok: true as const, value: undefined };
        case 'storage:put-result':
          await putResult(request.result);
          return { ok: true as const, value: undefined };
        case 'storage:clear':
          await clearDatabase();
          return { ok: true as const, value: undefined };
      }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : String(error) };
    }
  });
});
