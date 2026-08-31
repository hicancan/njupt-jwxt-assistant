import { mkdir, readFile, readdir, stat, writeFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { normalizeCatalogResponse, normalizeScheduleResponse } from '../src/api/normalize';
import type { CaptureJob, CaptureStatus, NormalizedSchedule, PeriodDefinition, TermSelection } from '../src/contracts/model';
import { buildSourcePackage } from '../src/export/sourcePackage';

interface RawCapture {
  status: CaptureStatus;
  descriptor: Record<string, unknown>;
  data: unknown;
  error: string | null;
}

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`${name} is required`);
  return path.resolve(value);
}

function parsePeriods(value: unknown): PeriodDefinition[] {
  if (!Array.isArray(value)) throw new Error('periods.raw.json must be an array');
  const dayParts: Record<string, string> = { 上午: 'morning', 下午: 'afternoon', 晚上: 'evening' };
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`period ${index + 1} is invalid`);
    const record = raw as Record<string, unknown>;
    const period = Number.parseInt(String(record.jcmc ?? ''), 10);
    const start = String(record.qssj ?? '').trim();
    const end = String(record.jssj ?? '').trim();
    const label = String(record.rsdmc ?? '').trim();
    if (period !== index + 1 || !start || !end || !label) throw new Error(`period ${index + 1} is incomplete`);
    return { period, start_time: start, end_time: end, day_part: dayParts[label] ?? label };
  });
}

async function main(): Promise<void> {
  const captureRoot = argument('--capture');
  const outputRoot = argument('--output-root');
  const term: TermSelection = {
    academic_year: '2026-2027',
    term_number: 1,
    internal_year_code: '2026',
    internal_term_code: '3',
  };
  const catalogPath = path.join(captureRoot, 'catalog.raw.json');
  const catalogRaw = JSON.parse(await readFile(catalogPath, 'utf8')) as unknown;
  const descriptors = normalizeCatalogResponse(catalogRaw, term);
  const periods = parsePeriods(JSON.parse(await readFile(path.join(captureRoot, 'periods.raw.json'), 'utf8')));
  const scheduleRoot = path.join(captureRoot, 'schedules');
  const files = await readdir(scheduleRoot);
  const captures = new Map<string, RawCapture>();
  for (const filename of files) {
    const capture = JSON.parse(await readFile(path.join(scheduleRoot, filename), 'utf8')) as RawCapture;
    const descriptorId = String(capture.descriptor.id ?? '').trim();
    if (!descriptorId || captures.has(descriptorId)) throw new Error(`raw schedule descriptor is missing or duplicated: ${filename}`);
    captures.set(descriptorId, capture);
  }
  if (captures.size !== descriptors.length) throw new Error(`raw schedule count mismatch: ${captures.size} / ${descriptors.length}`);
  const results: NormalizedSchedule[] = [];
  for (const descriptor of descriptors) {
    const capture = captures.get(descriptor.descriptor_id);
    if (!capture) throw new Error(`missing raw schedule: ${descriptor.descriptor_id}`);
    if (capture.status === 'failed') throw new Error(`failed raw schedule: ${descriptor.descriptor_id}: ${capture.error ?? 'unknown error'}`);
    if (capture.status === 'special') {
      results.push({ descriptor, status: 'special', meetings: [], practice_notes: [], supplemental: {}, weeks: [], weekday_names: {}, first_weekday: null, error: null });
      continue;
    }
    const normalized = normalizeScheduleResponse(descriptor, capture.data);
    results.push({ ...normalized, status: capture.status, error: capture.error });
  }
  const counts = results.reduce((accumulator, result) => {
    accumulator[result.status] += 1;
    return accumulator;
  }, { success: 0, empty: 0, special: 0, failed: 0 });
  const catalogStats = await stat(catalogPath);
  const job: CaptureJob = {
    job_id: `final-${term.internal_year_code}-${term.internal_term_code}`,
    term,
    observed_at: catalogStats.mtime.toISOString(),
    lifecycle: 'complete',
    catalog: descriptors,
    periods,
    progress: { total: descriptors.length, completed: descriptors.length, ...counts, current: null },
    last_error: null,
  };
  const built = await buildSourcePackage(job, results);
  const destination = path.join(outputRoot, built.manifest.source_id);
  try {
    await stat(destination);
    throw new Error(`destination already exists: ${destination}`);
  } catch (error) {
    if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
  }
  const sourceRoot = path.join(destination, 'source');
  await mkdir(sourceRoot, { recursive: true });
  for (const [relative, bytes] of Object.entries(unzipSync(built.archive))) {
    const target = path.resolve(sourceRoot, relative);
    if (!target.startsWith(`${sourceRoot}${path.sep}`)) throw new Error(`archive path escapes destination: ${relative}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  await cp(captureRoot, path.join(destination, 'raw'), { recursive: true, errorOnExist: true });
  console.log(JSON.stringify({ destination, manifest: built.manifest }, null, 2));
}

await main();
