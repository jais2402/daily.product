import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { parseFeedParams } from '@/lib/feed/params';
import { fetchFeedPage, fetchTopicsWithCounts } from '@/lib/feed/queries';
import { FeedCard } from './feed-card';

export const dynamic = 'force-dynamic';

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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <p className="text-neutral-600 dark:text-neutral-400">
        Curated daily content for product professionals — news, insights, and
        tools in one feed.
      </p>

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/"
          className={`rounded-full border px-3 py-1 text-sm ${
            topicSlug === null
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
        >
          All
        </Link>
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/?topic=${topic.slug}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              topicSlug === topic.slug
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            {topic.name}
          </Link>
        ))}
      </nav>

      {articles.length === 0 ? (
        <p className="py-12 text-center text-neutral-500">
          Nothing here yet — check back tomorrow
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <FeedCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex justify-between pt-4">
          {page > 1 ? (
            <Link
              href={`/?${new URLSearchParams({
                ...(topicSlug ? { topic: topicSlug } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}
