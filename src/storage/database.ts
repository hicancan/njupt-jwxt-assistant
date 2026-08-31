import type { CaptureJob, NormalizedSchedule } from '../contracts/model';
import type { StorageSnapshot } from './messages';

const DB_NAME = 'njupt-jwxt';
const DB_VERSION = 1;
const JOB_STORE = 'job';
const RESULT_STORE = 'results';

async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(JOB_STORE)) database.createObjectStore(JOB_STORE);
      if (!database.objectStoreNames.contains(RESULT_STORE)) database.createObjectStore(RESULT_STORE, { keyPath: 'descriptor.descriptor_id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开扩展数据库'));
  });
}

async function transaction<T>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (tx: IDBTransaction) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(stores, mode);
    let request: IDBRequest<T> | void;
    try {
      request = operation(tx);
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      const result = request ? request.result : undefined;
      database.close();
      resolve(result);
    };
    tx.onerror = () => {
      database.close();
      reject(tx.error ?? new Error('扩展数据库操作失败'));
    };
    tx.onabort = tx.onerror;
  });
}

export async function getSnapshot(): Promise<StorageSnapshot> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction([JOB_STORE, RESULT_STORE], 'readonly');
    const jobRequest = tx.objectStore(JOB_STORE).get('current');
    const resultsRequest = tx.objectStore(RESULT_STORE).getAll();
    tx.oncomplete = () => {
      const job = (jobRequest.result as CaptureJob | undefined) ?? null;
      const results = (resultsRequest.result as NormalizedSchedule[]).sort((left, right) =>
        left.descriptor.descriptor_id.localeCompare(right.descriptor.descriptor_id, 'zh-CN'),
      );
      database.close();
      resolve({ job, results });
    };
    tx.onerror = () => {
      database.close();
      reject(tx.error ?? new Error('读取扩展数据库失败'));
    };
  });
}

export async function putJob(job: CaptureJob): Promise<void> {
  await transaction([JOB_STORE], 'readwrite', (tx) => tx.objectStore(JOB_STORE).put(job, 'current'));
}

export async function putResult(result: NormalizedSchedule): Promise<void> {
  await transaction([RESULT_STORE], 'readwrite', (tx) => tx.objectStore(RESULT_STORE).put(result));
}

export async function clearDatabase(): Promise<void> {
  await transaction([JOB_STORE, RESULT_STORE], 'readwrite', (tx) => {
    tx.objectStore(JOB_STORE).clear();
    tx.objectStore(RESULT_STORE).clear();
  });
}
