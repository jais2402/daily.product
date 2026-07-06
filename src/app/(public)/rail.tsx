import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedTopicWithId } from '@/lib/feed/queries';

// Source glyph tile colors (design-handoff.md Design Tokens — "source colors").
// Duplicated from feed-card.tsx (small, presentation-only helpers; not worth
// promoting to a shared module for a two-file design pass).
const SOURCE_COLORS = [
  '#f6a723',
  '#8b7cf8',
  '#34d399',
  '#ff7a59',
  '#6ea8fe',
  '#e879f9',
  '#cbd5e1',
  '#f472b6',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function sourceColor(sourceName: string): string {
  return SOURCE_COLORS[hashString(sourceName) % SOURCE_COLORS.length];
}

interface RawSourceRow {
  sources: { name: string } | { name: string }[] | null;
}

interface TopSource {
  name: string;
  count: number;
}

/**
 * Top 4 sources by approved-article count. At 467 rows, fetching the source
 * name per article and grouping in JS is simpler and fast enough — no
 * Postgres RPC exists for this aggregation (see plan Task 2 spec).
 */
async function fetchTopSources(supabase: SupabaseClient): Promise<TopSource[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('sources(name)')
    .eq('status', 'approved');

  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as unknown as RawSourceRow[]) {
    const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
    const name = source?.name;
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export async function Rail({
  supabase,
  topics,
}: {
  supabase: SupabaseClient;
  topics: FeedTopicWithId[];
}) {
  const topSources = await fetchTopSources(supabase);

  return (
    <aside className="hidden xl:flex w-[296px] shrink-0 flex-col gap-[18px]">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3.5 font-display text-[15px] font-semibold text-text">
          Top sources
        </h2>
        <div className="flex flex-col gap-3">
          {topSources.map((source) => (
            <div key={source.name} className="flex items-center gap-2.5">
              <span
                className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold text-[#0d1016]"
                style={{ backgroundColor: sourceColor(source.name) }}
              >
                {source.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] font-semibold text-text">
                  {source.name}
                </span>
                <span className="text-[11.5px] text-faint">
                  {source.count} article{source.count === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-[15px] font-semibold text-text">
          Trending tags
        </h2>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/?topic=${topic.slug}`}
              className="rounded-lg border border-border bg-card2 px-[11px] py-1.5 text-[12.5px] text-muted hover:text-text"
            >
              # {topic.name}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
