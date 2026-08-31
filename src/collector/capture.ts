import { fetchCatalog, fetchPeriodDefinitions, fetchSchedule } from '../api/client';
import type {
  CaptureJob,
  CaptureProgress,
  CatalogDescriptor,
  NormalizedSchedule,
  TermSelection,
} from '../contracts/model';
import { captureStorage } from '../storage/client';

const sleep = (milliseconds: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

function resultIsEmpty(result: Omit<NormalizedSchedule, 'status' | 'error'>): boolean {
  return (
    result.meetings.length === 0 &&
    result.practice_notes.length === 0 &&
    Object.values(result.supplemental).every((items) => items.length === 0)
  );
}

function computeProgress(
  catalog: CatalogDescriptor[],
  results: Map<string, NormalizedSchedule>,
  current: string | null,
): CaptureProgress {
  const progress: CaptureProgress = {
    total: catalog.length,
    completed: results.size,
    success: 0,
    empty: 0,
    special: 0,
    failed: 0,
    current,
  };
  for (const result of results.values()) progress[result.status] += 1;
  return progress;
}

function isSameTerm(left: TermSelection, right: TermSelection): boolean {
  return (
    left.internal_year_code === right.internal_year_code &&
    left.internal_term_code === right.internal_term_code &&
    left.academic_year === right.academic_year &&
    left.term_number === right.term_number
  );
}

async function requestWithRetry(
  descriptor: CatalogDescriptor,
  term: TermSelection,
  signal: AbortSignal,
): Promise<Omit<NormalizedSchedule, 'status' | 'error'>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchSchedule(descriptor, term, signal);
    } catch (error) {
      lastError = error;
      if (signal.aborted || (error instanceof Error && error.message.includes('登录已失效'))) throw error;
      if (attempt < 3) await sleep(Math.min(8_000, 800 * 2 ** attempt), signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function runCapture(
  term: TermSelection,
  signal: AbortSignal,
  onUpdate: (job: CaptureJob) => void,
): Promise<CaptureJob> {
  let snapshot = await captureStorage.getSnapshot();
  if (snapshot.job && !isSameTerm(snapshot.job.term, term)) {
    await captureStorage.clear();
    snapshot = { job: null, results: [] };
  }

  const catalog = snapshot.job?.catalog.length ? snapshot.job.catalog : await fetchCatalog(term, signal);
  const periods = snapshot.job?.periods?.length ? snapshot.job.periods : await fetchPeriodDefinitions(term, signal);
  const results = new Map(snapshot.results.map((result) => [result.descriptor.descriptor_id, result]));
  let job: CaptureJob = {
    job_id: snapshot.job?.job_id ?? `${term.internal_year_code}-${term.internal_term_code}`,
    term,
    observed_at: snapshot.job?.observed_at ?? new Date().toISOString(),
    lifecycle: 'running',
    catalog,
    periods,
    progress: computeProgress(catalog, results, null),
    last_error: null,
  };
  await captureStorage.putJob(job);
  onUpdate(job);

  try {
    for (const descriptor of catalog) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const previous = results.get(descriptor.descriptor_id);
      if (previous && previous.status !== 'failed') continue;

      job = { ...job, progress: computeProgress(catalog, results, descriptor.class_id || descriptor.name) };
      await captureStorage.putJob(job);
      onUpdate(job);

      let result: NormalizedSchedule;
      if (descriptor.class_id === 'wbj') {
        result = {
          descriptor,
          status: 'special',
          meetings: [],
          practice_notes: [],
          supplemental: { student_class_notes: [], adjustments: [], display_notes: [] },
          weeks: [],
          weekday_names: {},
          first_weekday: null,
          error: null,
        };
      } else {
        try {
          const normalized = await requestWithRetry(descriptor, term, signal);
          result = { ...normalized, status: resultIsEmpty(normalized) ? 'empty' : 'success', error: null };
        } catch (error) {
          if (signal.aborted) throw error;
          const message = error instanceof Error ? error.message : String(error);
          result = {
            descriptor,
            status: 'failed',
            meetings: [],
            practice_notes: [],
            supplemental: { student_class_notes: [], adjustments: [], display_notes: [] },
            weeks: [],
            weekday_names: {},
            first_weekday: null,
            error: message,
          };
          if (message.includes('登录已失效')) {
            results.set(descriptor.descriptor_id, result);
            await captureStorage.putResult(result);
            throw new Error(message);
          }
        }
      }

      results.set(descriptor.descriptor_id, result);
      await captureStorage.putResult(result);
      job = { ...job, progress: computeProgress(catalog, results, null), last_error: result.error };
      await captureStorage.putJob(job);
      onUpdate(job);
      await sleep(500 + Math.floor(Math.random() * 501), signal);
    }

    const progress = computeProgress(catalog, results, null);
    job = { ...job, lifecycle: progress.failed === 0 ? 'complete' : 'paused', progress };
  } catch (error) {
    const isAbort = signal.aborted || (error instanceof DOMException && error.name === 'AbortError');
    job = {
      ...job,
      lifecycle: 'paused',
      progress: computeProgress(catalog, results, null),
      last_error: isAbort ? null : error instanceof Error ? error.message : String(error),
    };
  }
  await captureStorage.putJob(job);
  onUpdate(job);
  return job;
}

export async function cancelCapture(job: CaptureJob): Promise<CaptureJob> {
  const cancelled = { ...job, lifecycle: 'cancelled' as const, progress: { ...job.progress, current: null } };
  await captureStorage.putJob(cancelled);
  return cancelled;
}
