import { parseFeed } from './feed';

export const MAX_CONSECUTIVE_FAILURES = 5;

export type SourceRow = {
  id: string; name: string; feed_url: string; consecutive_failures: number;
};
export type NewArticle = {
  source_id: string; url: string; title: string; summary: string | null;
  image_url: string | null; author: string | null; published_at: string | null;
};
export type IngestSummary = {
  sources: number; fetched: number; inserted: number;
  failed: { name: string; error: string }[];
};
export type IngestDeps = {
  listActiveSources(): Promise<SourceRow[]>;
  fetchText(url: string): Promise<string>;
  existingUrls(urls: string[]): Promise<Set<string>>;
  insertPending(articles: NewArticle[]): Promise<number>;
  markSourceResult(
    id: string,
    r: { ok: true } | { ok: false; error: string; failures: number; pause: boolean },
  ): Promise<void>;
};

export async function runIngest(deps: IngestDeps): Promise<IngestSummary> {
  const sources = await deps.listActiveSources();
  const summary: IngestSummary = {
    sources: sources.length, fetched: 0, inserted: 0, failed: [],
  };

  for (const source of sources) {
    try {
      const xml = await deps.fetchText(source.feed_url);
      const items = await parseFeed(xml, source.feed_url); // baseUrl resolves relative links
      summary.fetched += 1;

      const urls = items.map((i) => i.url);
      const existing = await deps.existingUrls(urls);
      const fresh = items.filter((i) => !existing.has(i.url));

      if (fresh.length > 0) {
        summary.inserted += await deps.insertPending(
          fresh.map((i) => ({
            source_id: source.id,
            url: i.url,
            title: i.title,
            summary: i.excerpt,
            image_url: i.imageUrl,
            author: i.author,
            published_at: i.publishedAt,
          })),
        );
      }
      await deps.markSourceResult(source.id, { ok: true });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      const failures = source.consecutive_failures + 1;
      summary.failed.push({ name: source.name, error });
      await deps.markSourceResult(source.id, {
        ok: false, error, failures, pause: failures >= MAX_CONSECUTIVE_FAILURES,
      });
    }
  }
  return summary;
}
