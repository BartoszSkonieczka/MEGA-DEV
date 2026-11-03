import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, NightDigest, ReadNight } from './types.js';

type RunRecord = {
  at: string;
  job: string;
  status: DigestRow['lastStatus'];
  owner: string | null;
  error?: string;
};

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.at === 'string' &&
    typeof record.job === 'string' &&
    record.job.length > 0 &&
    (record.status === 'ok' || record.status === 'retry' || record.status === 'fail') &&
    (typeof record.owner === 'string' || record.owner === null) &&
    (record.error === undefined || typeof record.error === 'string')
  );
}

export const readNight: ReadNight = (runsDir, night): NightDigest => {
  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const rowsByJob = new Map<string, DigestRow>();
  let malformedLines = 0;

  for (const line of contents.split(/\r?\n/)) {
    if (line.trim() === '') continue;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }

    if (!isRunRecord(value)) {
      malformedLines += 1;
      continue;
    }

    const existing = rowsByJob.get(value.job);
    if (existing === undefined) {
      rowsByJob.set(value.job, {
        job: value.job,
        owner: value.owner,
        runs: 1,
        retries: value.status === 'retry' ? 1 : 0,
        lastStatus: value.status,
        lastError: value.error ?? null,
        firstTime: value.at,
        lastTime: value.at,
      });
      continue;
    }

    existing.owner = value.owner;
    existing.runs += 1;
    if (value.status === 'retry') existing.retries += 1;
    existing.lastStatus = value.status;
    if (value.error !== undefined) existing.lastError = value.error;
    existing.lastTime = value.at;
  }

  return {
    rows: [...rowsByJob.values()].sort((left, right) => left.job.localeCompare(right.job)),
    malformedLines,
  };
};
