import Link from 'next/link';
import { getServerSupabase, getSessionUser, getOwnProfile, getOwnReadDates } from '@/lib/supabase/cached';
import { parseFeedParams, type FeedTab } from '@/lib/feed/params';
import {
  fetchFeedPage,
  fetchTopicsWithCounts,
  fetchRecommendations,
  fetchRecentBookmarks,
  type RecommendedArticle,
} from '@/lib/feed/queries';
import { currentStreak } from '@/lib/streaks';
import { firstWord } from '@/lib/identity';
import { FeedCard } from './feed-card';
import { Rail, type StreakInfo } from './rail';

export const dynamic = 'force-dynamic';

// All four tabs are live this pass: New (chronological), Hot (recent-upvote
// heat), Most Read (distinct readers, 7d), Top (all-time upvotes) — see
// docs/superpowers/plans/2026-07-06-phase-5-interactions.md Task 2.
const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'hot', label: 'Hot' },
  { id: 'read', label: 'Most Read' },
  { id: 'top', label: 'Top' },
];

/**
 * Build a `/?...` href preserving topic/tab/q and setting the given
 * overrides. `q` composes with topic chips and pagination (search stays
 * active while the user narrows by topic or pages through results) — it's
 * only dropped deliberately by the "Clear" link and by submitting a new
 * search (see search-box.tsx, which drops topic/tab/page instead).
 */
function feedHref({
  topicSlug,
  tab,
  page,
  q,
}: {
  topicSlug: string | null;
  tab: FeedTab;
  page?: number;
  q?: string | null;
}): string {
  const params = new URLSearchParams();
  if (topicSlug) params.set('topic', topicSlug);
  if (tab !== 'new') params.set('tab', tab);
  if (page && page > 1) params.set('page', String(page));
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; page?: string; tab?: string; q?: string }>;
}) {
  const { topicSlug, page, tab, q } = parseFeedParams(await searchParams);
  const supabase = await getServerSupabase();

  // getSessionUser is request-scoped (React `cache()`) so this getUser()
  // call is shared with sidebar.tsx and topbar-user.tsx rather than
  // re-querying per component.
  const [{ articles, hasMore }, topics, user] = await Promise.all([
    fetchFeedPage(supabase, { topicSlug, page, tab, q }),
    fetchTopicsWithCounts(supabase),
    getSessionUser(),
  ]);
  const signedIn = Boolean(user);

  // Signed-in-only data: streak (rail streak card + greeting math), profile
  // (personalized greeting), "You might like" / "Recent bookmarks" rail
  // cards (Phase 8 Task 1). All four are independent of each other, so they
  // run in a single Promise.all rather than sequential awaits. `readDates`
  // and `profile` come from the cached helpers (shared with topbar-user.tsx
  // / sidebar.tsx); recommendations/bookmarks stay page.tsx-only fetches
  // since no other component needs them. Rail is a server component but is
  // only ever rendered from this page, so we pass `streak` / recs /
  // bookmarks down as props rather than have Rail re-derive auth itself.
  let streak: StreakInfo | null = null;
  let firstName: string | null = null;
  let recommendations: RecommendedArticle[] | null = null;
  let recentBookmarks: RecommendedArticle[] | null = null;

  if (user) {
    const [readDates, profile, recs, bookmarks] = await Promise.all([
      getOwnReadDates(),
      getOwnProfile(),
      fetchRecommendations(supabase, user.id),
      fetchRecentBookmarks(supabase, user.id),
    ]);

    firstName = profile?.display_name ? firstWord(profile.display_name) : null;
    recommendations = recs;
    recentBookmarks = bookmarks;

    const today = new Date().toISOString().slice(0, 10);
    const days = currentStreak(readDates, today);
    const readToday = readDates.includes(today);

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const countsByDate = new Map<string, number>();
    for (const d of readDates) countsByDate.set(d, (countsByDate.get(d) ?? 0) + 1);
    const last7Counts = last7.map((d) => countsByDate.get(d) ?? 0);

    streak = { days, readToday, last7Counts };
  }

  let bookmarkedIds = new Set<string>();
  let upvotedIds = new Set<string>();
  const upvoteCounts = new Map<string, number>();

  if (articles.length > 0) {
    const articleIds = articles.map((article) => article.id);

    // Bookmarks/upvotes/upvote-counts are independent — all three run in
    // one Promise.all (upvotes used to be a separate sequential await after
    // this batch resolved).
    const [{ data: bookmarkRows }, { data: countRows }, { data: upvoteRows }] = await Promise.all([
      user
        ? supabase
            .from('bookmarks')
            .select('article_id')
            .eq('user_id', user.id)
            .in('article_id', articleIds)
        : Promise.resolve({ data: [] as { article_id: string }[] }),
      supabase.from('articles').select('id,upvote_count').in('id', articleIds),
      user
        ? supabase
            .from('upvotes')
            .select('article_id')
            .eq('user_id', user.id)
            .in('article_id', articleIds)
        : Promise.resolve({ data: [] as { article_id: string }[] }),
    ]);

    bookmarkedIds = new Set((bookmarkRows ?? []).map((row) => row.article_id));
    upvotedIds = new Set((upvoteRows ?? []).map((row) => row.article_id));

    for (const row of (countRows ?? []) as { id: string; upvote_count: number }[]) {
      upvoteCounts.set(row.id, row.upvote_count);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 gap-[26px] px-7 pb-[60px] pt-[26px]">
      <div className="min-w-0 flex-1">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          {q ? (
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-[23px] font-bold tracking-[-0.02em] text-text">
                Results for &ldquo;{q}&rdquo;
              </h1>
              <Link href="/" className="text-[13.5px] text-muted hover:text-text">
                Clear ×
              </Link>
            </div>
          ) : (
            <h1 className="font-display text-[23px] font-bold tracking-[-0.02em] text-text">
              {firstName ? `Good morning, ${firstName} 👋` : 'Good morning 👋'}
            </h1>
          )}

          {/* Search is always recency-ordered (see queries.ts SEARCH MODE
              doc) — the tab pill has no meaning while a query is active. */}
          {!q && (
            <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
              {FEED_TABS.map((feedTab) => (
                <Link
                  key={feedTab.id}
                  href={feedHref({ topicSlug, tab: feedTab.id })}
                  aria-current={feedTab.id === tab ? 'page' : undefined}
                  className={`rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold ${
                    feedTab.id === tab
                      ? 'bg-acc text-[#0d1016]'
                      : 'text-muted'
                  }`}
                >
                  {feedTab.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="mb-[18px] flex flex-wrap gap-2">
          <Link
            href={feedHref({ topicSlug: null, tab, q })}
            className={`rounded-[10px] px-4 py-[9px] text-[13.5px] font-medium ${
              topicSlug === null
                ? 'bg-acc text-[#0d1016]'
                : 'border border-border bg-card text-muted'
            }`}
          >
            All
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={feedHref({ topicSlug: topic.slug, tab, q })}
              className={`rounded-[10px] px-4 py-[9px] text-[13.5px] font-medium ${
                topicSlug === topic.slug
                  ? 'bg-acc text-[#0d1016]'
                  : 'border border-border bg-card text-muted'
              }`}
            >
              {topic.name}
            </Link>
          ))}
        </nav>

        {articles.length === 0 ? (
          <div className="py-12 text-center text-muted">
            {q ? (
              <>
                <p>No articles match &ldquo;{q}&rdquo;</p>
                <Link href="/" className="mt-2 inline-block text-[13.5px] text-muted hover:text-text">
                  Clear ×
                </Link>
              </>
            ) : (
              <p>Nothing here yet — check back tomorrow</p>
            )}
          </div>
        ) : (
          <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <FeedCard
                key={article.id}
                article={article}
                upvoteCount={upvoteCounts.get(article.id) ?? 0}
                upvoted={upvotedIds.has(article.id)}
                bookmarked={bookmarkedIds.has(article.id)}
                signedIn={signedIn}
              />
            ))}
          </div>
        )}

        {(page > 1 || hasMore) && (
          <div className="flex justify-between pt-6">
            {page > 1 ? (
              <Link
                href={feedHref({ topicSlug, tab, page: page - 1, q })}
                className="rounded-[10px] border border-border bg-card px-4 py-2 text-[13.5px] text-text hover:border-acc"
              >
                ← Prev
              </Link>
            ) : (
              <span />
            )}
            {hasMore ? (
              <Link
                href={feedHref({ topicSlug, tab, page: page + 1, q })}
                className="rounded-[10px] border border-border bg-card px-4 py-2 text-[13.5px] text-text hover:border-acc"
              >
                Next →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>

      <Rail
        supabase={supabase}
        topics={topics}
        streak={streak}
        recommendations={recommendations}
        recentBookmarks={recentBookmarks}
      />
    </main>
  );
}
