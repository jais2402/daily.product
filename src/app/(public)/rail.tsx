import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedTopicWithId, RecommendedArticle } from '@/lib/feed/queries';

// Level colors 0->4, from design-handoff.md §8 "Level colors" — reused here
// for the rail's 7-cell mini activity bar (§5 card 1).
const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '#1a1f28',
  1: 'rgba(139,124,248,.35)',
  2: 'rgba(139,124,248,.6)',
  3: 'rgba(139,124,248,.82)',
  4: '#8b7cf8',
};

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

function FlameIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9.5 10.5 12 8 12 3Z" />
    </svg>
  );
}

/**
 * Streak info for the rail card, computed by page.tsx (which already fetches
 * the user server-side) and passed down as a prop. Rail is a server
 * component but is only ever rendered by page.tsx, so passing props here is
 * simpler than having Rail re-derive auth/read-date state itself.
 */
export interface StreakInfo {
  days: number;
  readToday: boolean;
  /** Read counts for the last 7 days, oldest -> newest (today last). */
  last7Counts: number[];
}

function StreakCard({ streak }: { streak: StreakInfo }) {
  const max = Math.max(1, ...streak.last7Counts);
  return (
    <div
      className="rounded-2xl border border-border p-4"
      style={{
        background:
          'linear-gradient(135deg, rgba(139,124,248,.12), rgba(246,167,35,.10))',
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex text-amber">
          <FlameIcon />
        </span>
        <span className="font-display text-[15px] font-semibold text-text">
          {streak.days}-day streak
        </span>
      </div>
      <p className="mb-3 text-[12.5px] leading-[1.45] text-muted">
        {streak.readToday
          ? "You're on fire — keep it up"
          : 'Read one article today to keep it going'}
      </p>
      <div className="flex h-8 items-end gap-1">
        {streak.last7Counts.map((count, i) => {
          const level = levelFor(count);
          const height = count === 0 ? 4 : Math.round((count / max) * 32);
          return (
            <div
              key={i}
              className="w-full rounded-[4px]"
              style={{ height, backgroundColor: LEVEL_COLORS[level] }}
            />
          );
        })}
      </div>
    </div>
  );
}

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

// Duplicated from feed-card.tsx / article/[id]/page.tsx — small,
// presentation-only helper; not worth promoting to a shared module for a
// single-file addition (see rail.tsx's own precedent for SOURCE_COLORS).
function formatRelativeDate(published_at: string | null): string | null {
  if (!published_at) return null;
  const date = new Date(published_at);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Shared row idiom for the rail's article-list cards ("You might like",
 * "Recent bookmarks"): 22px source glyph tile + line-clamp-2 title +
 * "source · relative date" — same visual language as the article detail
 * page's "You might also like" rows (article/[id]/page.tsx).
 */
function ArticleRow({ article }: { article: RecommendedArticle }) {
  const date = formatRelativeDate(article.published_at);
  const glyph = (article.source_name ?? '?').charAt(0).toUpperCase();

  return (
    <Link
      href={`/article/${article.id}`}
      className="flex items-start gap-2.5 rounded-lg -mx-1 px-1 py-1 hover:bg-card2"
    >
      <span
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold text-[#0d1016]"
        style={{ backgroundColor: sourceColor(article.source_name ?? 'unknown') }}
      >
        {glyph}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-[13px] font-medium leading-[1.35] text-text">
          {article.title}
        </span>
        <span className="text-[11.5px] text-faint">
          {article.source_name ?? 'Unknown source'}
          {date ? ` · ${date}` : ''}
        </span>
      </div>
    </Link>
  );
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
  streak,
  recommendations,
  recentBookmarks,
}: {
  supabase: SupabaseClient;
  topics: FeedTopicWithId[];
  streak: StreakInfo | null;
  /** Signed-in only; null when signed out or when there are no matches. */
  recommendations: RecommendedArticle[] | null;
  /** Signed-in only; null when signed out or when there are no bookmarks. */
  recentBookmarks: RecommendedArticle[] | null;
}) {
  const topSources = await fetchTopSources(supabase);

  return (
    <aside className="hidden xl:flex w-[296px] shrink-0 flex-col gap-[18px]">
      {streak && <StreakCard streak={streak} />}

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

      {recommendations && recommendations.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3.5 font-display text-[15px] font-semibold text-text">
            You might like
          </h2>
          <div className="flex flex-col gap-3">
            {recommendations.map((article) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

      {recentBookmarks && recentBookmarks.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-semibold text-text">
              Recent bookmarks
            </h2>
            <Link
              href="/bookmarks"
              className="text-[12px] font-semibold text-acc hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentBookmarks.map((article) => (
              <ArticleRow key={article.id} article={article} />
            ))}
          </div>
        </div>
      )}

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
