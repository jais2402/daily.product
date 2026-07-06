import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { parseFeedParams, type FeedTab } from '@/lib/feed/params';
import { fetchFeedPage, fetchTopicsWithCounts } from '@/lib/feed/queries';
import { FeedCard } from './feed-card';
import { Rail } from './rail';

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

/** Build a `/?...` href preserving topic/tab and setting the given overrides. */
function feedHref({
  topicSlug,
  tab,
  page,
}: {
  topicSlug: string | null;
  tab: FeedTab;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (topicSlug) params.set('topic', topicSlug);
  if (tab !== 'new') params.set('tab', tab);
  if (page && page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; page?: string; tab?: string }>;
}) {
  const { topicSlug, page, tab } = parseFeedParams(await searchParams);
  const supabase = await createServerSupabase();

  const [{ articles, hasMore }, topics] = await Promise.all([
    fetchFeedPage(supabase, { topicSlug, page, tab }),
    fetchTopicsWithCounts(supabase),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  let bookmarkedIds = new Set<string>();
  let upvotedIds = new Set<string>();
  const upvoteCounts = new Map<string, number>();

  if (articles.length > 0) {
    const articleIds = articles.map((article) => article.id);

    const [{ data: bookmarkRows }, { data: countRows }] = await Promise.all([
      user
        ? supabase
            .from('bookmarks')
            .select('article_id')
            .eq('user_id', user.id)
            .in('article_id', articleIds)
        : Promise.resolve({ data: [] as { article_id: string }[] }),
      supabase.from('articles').select('id,upvote_count').in('id', articleIds),
    ]);

    bookmarkedIds = new Set((bookmarkRows ?? []).map((row) => row.article_id));

    if (user) {
      const { data: upvoteRows } = await supabase
        .from('upvotes')
        .select('article_id')
        .eq('user_id', user.id)
        .in('article_id', articleIds);
      upvotedIds = new Set((upvoteRows ?? []).map((row) => row.article_id));
    }

    for (const row of (countRows ?? []) as { id: string; upvote_count: number }[]) {
      upvoteCounts.set(row.id, row.upvote_count);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 gap-[26px] px-7 pb-[60px] pt-[26px]">
      <div className="min-w-0 flex-1">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[23px] font-bold tracking-[-0.02em] text-text">
            Good morning 👋
          </h1>

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
        </div>

        <nav className="mb-[18px] flex flex-wrap gap-2">
          <Link
            href={feedHref({ topicSlug: null, tab })}
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
              href={feedHref({ topicSlug: topic.slug, tab })}
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
          <p className="py-12 text-center text-muted">
            Nothing here yet — check back tomorrow
          </p>
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
                href={feedHref({ topicSlug, tab, page: page - 1 })}
                className="rounded-[10px] border border-border bg-card px-4 py-2 text-[13.5px] text-text hover:border-acc"
              >
                ← Prev
              </Link>
            ) : (
              <span />
            )}
            {hasMore ? (
              <Link
                href={feedHref({ topicSlug, tab, page: page + 1 })}
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

      <Rail supabase={supabase} topics={topics} />
    </main>
  );
}
