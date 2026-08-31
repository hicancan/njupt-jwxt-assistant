import { strToU8, zipSync } from 'fflate';
import { containsSensitiveKeys } from '../api/normalize';
import { SOURCE_FORMAT, type ArtifactReference, type CaptureJob, type NormalizedSchedule } from '../contracts/model';

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalValue(item)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalValue(value))}\n`;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function artifact(path: string, value: unknown): Promise<{ bytes: Uint8Array; reference: ArtifactReference }> {
  const bytes = strToU8(canonicalJson(value));
  return { bytes, reference: { path, bytes: bytes.byteLength, sha256: await sha256(bytes) } };
}

export async function buildSourcePackage(job: CaptureJob, results: NormalizedSchedule[]) {
  if (job.lifecycle !== 'complete' || job.progress.failed !== 0) throw new Error('只有完整且无失败的采集任务可以导出');
  if (results.length !== job.catalog.length) throw new Error('采集结果数量与目录不一致');
  if (containsSensitiveKeys(results)) throw new Error('导出内容包含敏感字段');

  const files: Record<string, Uint8Array> = {};
  const references: ArtifactReference[] = [];
  const add = async (path: string, value: unknown) => {
    const built = await artifact(path, value);
    files[path] = built.bytes;
    references.push(built.reference);
  };

  const sortedResults = [...results].sort((left, right) =>
    left.descriptor.descriptor_id.localeCompare(right.descriptor.descriptor_id, 'zh-CN'),
  );
  await add('catalog.json', sortedResults.map(({ descriptor, status, error }) => ({ descriptor, status, error })));

  const firstWithTerm = sortedResults.find((result) => result.weeks.length > 0);
  await add('term.json', { ...job.term, weeks: firstWithTerm?.weeks ?? [] });
  await add('periods.json', { source: 'current-teaching-system', periods: job.periods });
  for (const result of sortedResults) {
    await add(`schedules/${encodeURIComponent(result.descriptor.descriptor_id)}.json`, result);
  }

  references.sort((left, right) => left.path.localeCompare(right.path));
  const identityInput = {
    format: SOURCE_FORMAT,
    academic_year: job.term.academic_year,
    term_number: job.term.term_number,
    internal_year_code: job.term.internal_year_code,
    internal_term_code: job.term.internal_term_code,
    catalog_count: job.catalog.length,
    successful_count: job.progress.success,
    empty_count: job.progress.empty,
    special_count: job.progress.special,
    failed_count: job.progress.failed,
    week_count: firstWithTerm?.weeks.length ?? 0,
    period_count: job.periods.length,
    artifacts: references,
  };
  const sourceId = await sha256(strToU8(canonicalJson(identityInput)));
  const manifest = {
    ...identityInput,
    source_id: sourceId,
    observed_at: job.observed_at,
  };
  files['manifest.json'] = strToU8(canonicalJson(manifest));
  const archive = zipSync(files, { level: 9, mtime: new Date('1980-01-01T00:00:00') });
  return { archive, manifest };
}

export function downloadSourcePackage(archive: Uint8Array, sourceId: string, term: string): void {
  const blob = new Blob([archive as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `njupt-teaching-schedule-${term}-${sourceId}.zip`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
