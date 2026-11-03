import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const baseConfig = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
};

const run = JSON.stringify({
  at: '2026-11-02T23:15:00+01:00',
  job: 'backup/nightly',
  status: 'ok',
  owner: 'rook',
});

describe('digest routes', () => {
  let runsDir: string;

  beforeEach(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  });

  afterEach(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  it('renders an HTML digest for a night with a run', async () => {
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), `${run}\n`);

    const response = await createApp({ ...baseConfig, runsDir }).request('/digest/2026-11-02');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('backup/nightly');
    expect(html).toContain('rook');
  });

  it('returns the digest as JSON for a night with a run', async () => {
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), `${run}\n`);

    const response = await createApp({ ...baseConfig, runsDir }).request('/api/digest/2026-11-02');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({
      rows: [
        {
          job: 'backup/nightly',
          owner: 'rook',
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstTime: '2026-11-02T23:15:00+01:00',
          lastTime: '2026-11-02T23:15:00+01:00',
        },
      ],
      malformedLines: 0,
    });
  });

  it.each([
    ['/digest/2026-11-03', 'HTML'],
    ['/api/digest/2026-11-03', 'JSON'],
  ])('returns 404 for a missing night (%s, %s)', async (path) => {
    const response = await createApp({ ...baseConfig, runsDir }).request(path);

    expect(response.status).toBe(404);
  });

  it('renders an empty HTML digest for an empty file', async () => {
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');

    const response = await createApp({ ...baseConfig, runsDir }).request('/digest/2026-11-02');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('returns an empty JSON digest for an empty file', async () => {
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), '');

    const response = await createApp({ ...baseConfig, runsDir }).request('/api/digest/2026-11-02');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rows: [], malformedLines: 0 });
  });

  it('renders an HTML digest when the file contains a bad line', async () => {
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), `not json\n${run}\n`);

    const response = await createApp({ ...baseConfig, runsDir }).request('/digest/2026-11-02');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('backup/nightly');
    expect(html).not.toContain('not json');
  });

  it('returns valid rows and counts bad lines in JSON', async () => {
    writeFileSync(join(runsDir, '2026-11-02.jsonl'), `not json\n${run}\n`);

    const response = await createApp({ ...baseConfig, runsDir }).request('/api/digest/2026-11-02');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      rows: [
        {
          job: 'backup/nightly',
          owner: 'rook',
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstTime: '2026-11-02T23:15:00+01:00',
          lastTime: '2026-11-02T23:15:00+01:00',
        },
      ],
      malformedLines: 1,
    });
  });
});
