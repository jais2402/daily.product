import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import type { FeedArticle, FeedTopic } from '@/lib/feed/queries';
import { FeedCard } from '../feed-card';

export const dynamic = 'force-dynamic';

function BookmarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface RawArticleRow {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  status: string;
  sources: { name: string } | { name: string }[] | null;
  article_topics: { topics: FeedTopic | FeedTopic[] | null }[] | null;
}

interface RawBookmarkRow {
  created_at: string;
  articles: RawArticleRow | RawArticleRow[] | null;
}

function mapRow(row: RawArticleRow): FeedArticle {
  const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
  const topics: FeedTopic[] = (row.article_topics ?? []).flatMap((entry) => {
    const t = entry.topics;
    if (!t) return [];
    return Array.isArray(t) ? t : [t];
  });

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    image_url: row.image_url,
    author: row.author,
    published_at: row.published_at,
    source_name: source?.name ?? null,
    topics,
  };
}

/**
 * Fetch the signed-in user's bookmarks, newest-bookmarked-first, joined to
 * their approved articles. Bookmarks pointing at an article that's since
 * been unapproved (or otherwise missing) are dropped defensively — the FK
 * ensures the row exists, but `status` can change after the bookmark was
 * made.
 */
async function fetchBookmarkedArticles(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
): Promise<FeedArticle[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(
      'created_at,articles(id,url,title,summary,image_url,author,published_at,status,sources(name),article_topics(topics(id,name,slug)))',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawBookmarkRow[];

  return rows
    .map((row) => (Array.isArray(row.articles) ? row.articles[0] : row.articles))
    .filter((article): article is RawArticleRow => article != null && article.status === 'approved')
    .map(mapRow);
}

export default async function BookmarksPage() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const articles = await fetchBookmarkedArticles(supabase, user.id);

  let upvotedIds = new Set<string>();
  const upvoteCounts = new Map<string, number>();

  if (articles.length > 0) {
    const articleIds = articles.map((article) => article.id);

    const [{ data: upvoteRows }, { data: countRows }] = await Promise.all([
      supabase
        .from('upvotes')
        .select('article_id')
        .eq('user_id', user.id)
        .in('article_id', articleIds),
      supabase.from('articles').select('id,upvote_count').in('id', articleIds),
    ]);

    upvotedIds = new Set((upvoteRows ?? []).map((row) => row.article_id));

    for (const row of (countRows ?? []) as { id: string; upvote_count: number }[]) {
      upvoteCounts.set(row.id, row.upvote_count);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-7 pb-[60px] pt-[26px]">
      <div className="mb-[18px]">
        <h1 className="font-display text-[23px] font-bold tracking-[-0.02em] text-text">
          Saved for later
        </h1>
        <p className="mt-1 text-[13.5px] text-muted">
          {articles.length} bookmarked · organized by date
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-muted">
            <BookmarkIcon />
          </div>
          <h2 className="font-display text-[16.5px] font-semibold text-text">
            No bookmarks yet
          </h2>
          <p className="max-w-[320px] text-[13.5px] text-muted">
            Save articles from the feed to come back to them later — they&apos;ll show up here.
          </p>
          <Link
            href="/"
            className="mt-1 rounded-[10px] bg-acc px-4 py-2 font-display text-[13.5px] font-semibold text-[#0d1016]"
          >
            Browse the feed
          </Link>
        </div>
      ) : (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <FeedCard
              key={article.id}
              article={article}
              upvoteCount={upvoteCounts.get(article.id) ?? 0}
              upvoted={upvotedIds.has(article.id)}
              bookmarked
              signedIn
            />
          ))}
        </div>
      )}
    </main>
  );
}
