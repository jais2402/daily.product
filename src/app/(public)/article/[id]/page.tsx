import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { ArticleActions } from './article-actions';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Source glyph tile colors (design-handoff.md Design Tokens — "source
// colors"). Duplicated from feed-card.tsx / rail.tsx — small,
// presentation-only helpers; not worth promoting to a shared module for a
// three-file design pass (see Task 1/2 precedent in rail.tsx).
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

function sourceColor(sourceName: string | null): string {
  const key = sourceName ?? 'unknown';
  return SOURCE_COLORS[hashString(key) % SOURCE_COLORS.length];
}

function thumbnailGradient(seed: string): string {
  const h1 = hashString(seed) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 62% 46%), hsl(${h2} 58% 26%))`;
}

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

/** n = max(1, round(words(summary)/220)) — Global Constraints. */
function estimateReadMinutes(summary: string | null): number | null {
  if (!summary) return null;
  const words = summary.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 220));
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

interface ArticleTopic {
  id: string;
  name: string;
  slug: string;
}

interface ArticleDetail {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  source_name: string | null;
  upvote_count: number;
  topics: ArticleTopic[];
}

interface RawDetailRow {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  upvote_count: number;
  sources: { name: string } | { name: string }[] | null;
  article_topics:
    | { topics: ArticleTopic | ArticleTopic[] | null }[]
    | null;
}

async function fetchArticle(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  id: string,
): Promise<ArticleDetail | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(
      'id,url,title,summary,image_url,author,published_at,upvote_count,sources(name),article_topics(topics(id,name,slug))',
    )
    .eq('status', 'approved')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as RawDetailRow;
  const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
  const topics = (row.article_topics ?? []).flatMap((entry) => {
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
    upvote_count: row.upvote_count,
    source_name: source?.name ?? null,
    topics,
  };
}

interface RelatedArticle {
  id: string;
  title: string;
  source_name: string | null;
  published_at: string | null;
}

interface RawRelatedRow {
  id: string;
  title: string;
  published_at: string | null;
  sources: { name: string } | { name: string }[] | null;
}

/**
 * Up to 3 other approved articles sharing this article's first topic,
 * newest first, excluding self. The inner-join filter embed is aliased to
 * avoid the dual-embed PostgREST pitfall documented in
 * src/lib/feed/queries.ts (fetchFeedPage) — a second `article_topics`
 * embed here (even unaliased) would collide if we ever add one.
 */
async function fetchRelated(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  topicId: string,
  excludeId: string,
): Promise<RelatedArticle[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id,title,published_at,sources(name),filter_topic:article_topics!inner(topic_id)')
    .eq('status', 'approved')
    .eq('filter_topic.topic_id', topicId)
    .neq('id', excludeId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawRelatedRow[]).map((row) => {
    const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
    return {
      id: row.id,
      title: row.title,
      published_at: row.published_at,
      source_name: source?.name ?? null,
    };
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createServerSupabase();
  const article = await fetchArticle(supabase, id);
  if (!article) notFound();

  const date = formatRelativeDate(article.published_at);
  const readMin = estimateReadMinutes(article.summary);
  const firstTopic = article.topics[0] ?? null;
  const glyph = (article.source_name ?? '?').charAt(0).toUpperCase();

  const related = firstTopic
    ? await fetchRelated(supabase, firstTopic.id, article.id)
    : [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  let upvoted = false;
  let bookmarked = false;
  if (user) {
    const [{ data: upvoteRow }, { data: bookmarkRow }] = await Promise.all([
      supabase
        .from('upvotes')
        .select('article_id')
        .eq('user_id', user.id)
        .eq('article_id', article.id)
        .maybeSingle(),
      supabase
        .from('bookmarks')
        .select('article_id')
        .eq('user_id', user.id)
        .eq('article_id', article.id)
        .maybeSingle(),
    ]);
    upvoted = Boolean(upvoteRow);
    bookmarked = Boolean(bookmarkRow);
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-7 pb-20 pt-[26px]">
      <Link
        href="/"
        className="mb-[22px] inline-flex items-center gap-1.5 text-[13.5px] text-muted hover:text-text"
      >
        <ChevronLeftIcon /> Back to feed
      </Link>

      <div className="mb-4 flex items-center gap-[9px]">
        <span
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold text-[#0d1016]"
          style={{ backgroundColor: sourceColor(article.source_name) }}
        >
          {glyph}
        </span>
        <span className="text-[13.5px] font-semibold text-muted">
          {article.source_name ?? 'Unknown source'}
        </span>
        {date && (
          <>
            <span className="text-faint">·</span>
            <span className="text-[13px] text-faint">{date}</span>
          </>
        )}
      </div>

      {firstTopic && (
        <span
          className="mb-3.5 inline-block rounded-lg px-3 py-1 text-[12px] font-semibold text-acc"
          style={{ backgroundColor: 'rgba(139,124,248,.14)' }}
        >
          {firstTopic.name}
        </span>
      )}

      <h1 className="mb-[18px] font-display text-[32px] font-bold leading-[1.2] tracking-[-0.02em] text-text">
        {article.title}
      </h1>

      {readMin !== null && (
        <div className="mb-[22px] flex items-center gap-1.5 text-[13px] text-faint">
          <ClockIcon />
          <span>{readMin} min read</span>
        </div>
      )}

      <div className="mb-[26px] h-[220px] overflow-hidden rounded-[14px]">
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: thumbnailGradient(firstTopic?.slug ?? article.id) }}
          />
        )}
      </div>

      {article.summary && (
        <div className="mb-[26px] rounded-r-xl border-l-[3px] border-acc bg-card p-4">
          <div className="mb-[7px] text-[11.5px] font-semibold uppercase tracking-[.08em] text-acc">
            TL;DR
          </div>
          <p className="text-[16px] leading-[1.72] text-[#cdd6df]">
            {article.summary}
          </p>
        </div>
      )}

      <ArticleActions
        articleId={article.id}
        upvoteCount={article.upvote_count}
        upvoted={upvoted}
        bookmarked={bookmarked}
        signedIn={signedIn}
        url={article.url}
        title={article.title}
      />

      {related.length > 0 && (
        <>
          <h2 className="mb-4 font-display text-[19px] font-bold text-text">
            You might also like
          </h2>
          <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {related.map((rec) => {
              const recDate = formatRelativeDate(rec.published_at);
              const recGlyph = (rec.source_name ?? '?').charAt(0).toUpperCase();
              return (
                <Link
                  key={rec.id}
                  href={`/article/${rec.id}`}
                  className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-3.5 hover:border-acc"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold text-[#0d1016]"
                      style={{ backgroundColor: sourceColor(rec.source_name) }}
                    >
                      {recGlyph}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <h4 className="line-clamp-2 text-[13.5px] font-medium leading-[1.35] text-text">
                        {rec.title}
                      </h4>
                      <span className="text-[12px] text-faint">
                        {rec.source_name ?? 'Unknown source'}
                        {recDate ? ` · ${recDate}` : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
