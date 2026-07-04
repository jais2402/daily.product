import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { IngestDeps, NewArticle } from './run';

export function makeSupabaseIngestDeps(): IngestDeps {
  const db = createAdminSupabase();
  return {
    async listActiveSources() {
      const { data, error } = await db
        .from('sources')
        .select('id,name,feed_url,consecutive_failures')
        .eq('status', 'active');
      if (error) throw new Error(`listActiveSources: ${error.message}`);
      return data ?? [];
    },
    async fetchText(url) {
      const res = await fetch(url, {
        headers: { 'user-agent': 'DailyProductBot/1.0 (+https://dailyproduct.app)' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
    async existingUrls(urls) {
      if (urls.length === 0) return new Set();
      const { data, error } = await db.from('articles').select('url').in('url', urls);
      if (error) throw new Error(`existingUrls: ${error.message}`);
      return new Set((data ?? []).map((r) => r.url));
    },
    async insertPending(articles: NewArticle[]) {
      const { data, error } = await db
        .from('articles')
        .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
        .select('id');
      if (error) throw new Error(`insertPending: ${error.message}`);
      return data?.length ?? 0;
    },
    async markSourceResult(id, r) {
      const patch = r.ok
        ? { last_fetched_at: new Date().toISOString(), last_error: null, consecutive_failures: 0 }
        : {
            last_fetched_at: new Date().toISOString(),
            last_error: r.error,
            consecutive_failures: r.failures,
            ...(r.pause ? { status: 'paused' as const } : {}),
          };
      const { error } = await db.from('sources').update(patch).eq('id', id);
      if (error) throw new Error(`markSourceResult: ${error.message}`);
    },
  };
}
