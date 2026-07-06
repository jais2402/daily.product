import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { parseFeedParams } from '@/lib/feed/params';
import { fetchFeedPage, fetchTopicsWithCounts } from '@/lib/feed/queries';
import { FeedCard } from './feed-card';
import { Rail } from './rail';

export const dynamic = 'force-dynamic';

// Feed tab switcher: only "New" is wired up this pass. The other three need
// interaction/read data that doesn't exist yet (Phase 5) — see Global
// Constraints in the design-pass plan.
const FEED_TABS = [
  { id: 'new', label: 'New' },
  { id: 'hot', label: 'Hot' },
  { id: 'read', label: 'Most Read' },
  { id: 'top', label: 'Top' },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; page?: string }>;
}) {
  const { topicSlug, page } = parseFeedParams(await searchParams);
  const supabase = await createServerSupabase();

  const [{ articles, hasMore }, topics] = await Promise.all([
    fetchFeedPage(supabase, { topicSlug, page }),
    fetchTopicsWithCounts(supabase),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 gap-[26px] px-7 pb-[60px] pt-[26px]">
      <div className="min-w-0 flex-1">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[23px] font-bold tracking-[-0.02em] text-text">
            Good morning 👋
          </h1>

          <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
            {FEED_TABS.map((tab) =>
              tab.id === 'new' ? (
                <button
                  key={tab.id}
                  type="button"
                  className="rounded-[9px] bg-acc px-3.5 py-1.5 text-[13px] font-semibold text-[#0d1016]"
                >
                  {tab.label}
                </button>
              ) : (
                <button
                  key={tab.id}
                  type="button"
                  disabled
                  title="Coming with accounts"
                  className="cursor-default rounded-[9px] px-3.5 py-1.5 text-[13px] font-semibold text-muted"
                >
                  {tab.label}
                </button>
              ),
            )}
          </div>
        </div>

        <nav className="mb-[18px] flex flex-wrap gap-2">
          <Link
            href="/"
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
              href={`/?topic=${topic.slug}`}
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
              <FeedCard key={article.id} article={article} />
            ))}
          </div>
        )}

        {(page > 1 || hasMore) && (
          <div className="flex justify-between pt-6">
            {page > 1 ? (
              <Link
                href={`/?${new URLSearchParams({
                  ...(topicSlug ? { topic: topicSlug } : {}),
                  page: String(page - 1),
                }).toString()}`}
                className="rounded-[10px] border border-border bg-card px-4 py-2 text-[13.5px] text-text hover:border-acc"
              >
                ← Prev
              </Link>
            ) : (
              <span />
            )}
            {hasMore ? (
              <Link
                href={`/?${new URLSearchParams({
                  ...(topicSlug ? { topic: topicSlug } : {}),
                  page: String(page + 1),
                }).toString()}`}
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
