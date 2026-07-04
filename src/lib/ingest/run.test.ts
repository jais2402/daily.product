import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runIngest, type IngestDeps } from './run';

const rss = readFileSync(join(__dirname, 'fixtures/sample-rss.xml'), 'utf8');

function makeDeps(overrides: Partial<IngestDeps> = {}) {
  const inserted: unknown[] = [];
  const sourceResults: Record<string, unknown> = {};
  const deps: IngestDeps = {
    listActiveSources: async () => [
      { id: 's1', name: 'PM Blog', feed_url: 'https://pmblog.com/rss', consecutive_failures: 0 },
    ],
    fetchText: async () => rss,
    existingUrls: async () => new Set(),
    insertPending: async (rows) => { inserted.push(...rows); return rows.length; },
    markSourceResult: async (id, r) => { sourceResults[id] = r; },
    ...overrides,
  };
  return { deps, inserted, sourceResults };
}

describe('runIngest', () => {
  it('inserts new articles as pending and marks source ok', async () => {
    const { deps, inserted, sourceResults } = makeDeps();
    const summary = await runIngest(deps);
    expect(summary).toMatchObject({ sources: 1, fetched: 1, inserted: 1, failed: [] });
    expect(inserted[0]).toMatchObject({
      source_id: 's1',
      url: 'https://pmblog.com/prioritize',
      title: 'How to prioritize',
    });
    expect(sourceResults['s1']).toEqual({ ok: true });
  });

  it('skips articles that already exist', async () => {
    const { deps } = makeDeps({
      existingUrls: async () => new Set(['https://pmblog.com/prioritize']),
    });
    const summary = await runIngest(deps);
    expect(summary.inserted).toBe(0);
  });

  it('one failing source never aborts the run and increments failures', async () => {
    const { deps, sourceResults } = makeDeps({
      listActiveSources: async () => [
        { id: 'bad', name: 'Broken', feed_url: 'https://x.com/rss', consecutive_failures: 3 },
        { id: 's1', name: 'PM Blog', feed_url: 'https://pmblog.com/rss', consecutive_failures: 0 },
      ],
      fetchText: async (url) => {
        if (url === 'https://x.com/rss') throw new Error('HTTP 500');
        return rss;
      },
    });
    const summary = await runIngest(deps);
    expect(summary.inserted).toBe(1);
    expect(summary.failed).toEqual([{ name: 'Broken', error: 'HTTP 500' }]);
    expect(sourceResults['bad']).toEqual({ ok: false, error: 'HTTP 500', failures: 4, pause: false });
  });

  it('pauses a source at 5 consecutive failures', async () => {
    const { deps, sourceResults } = makeDeps({
      listActiveSources: async () => [
        { id: 'bad', name: 'Broken', feed_url: 'https://x.com/rss', consecutive_failures: 4 },
      ],
      fetchText: async () => { throw new Error('timeout'); },
    });
    await runIngest(deps);
    expect(sourceResults['bad']).toEqual({ ok: false, error: 'timeout', failures: 5, pause: true });
  });
});
