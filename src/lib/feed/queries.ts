import type { SupabaseClient } from '@supabase/supabase-js';

export const PAGE_SIZE = 24;

export interface FeedTopic {
  name: string;
  slug: string;
}

export interface FeedArticle {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  source_name: string | null;
  topics: FeedTopic[];
}

export interface FeedPageParams {
  topicSlug: string | null;
  page: number;
}

export interface FeedPage {
  articles: FeedArticle[];
  hasMore: boolean;
}

interface RawArticleRow {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  sources: { name: string } | { name: string }[] | null;
  all_topics: { topics: FeedTopic | FeedTopic[] | null }[] | null;
}

const ARTICLE_SELECT =
  'id,url,title,summary,image_url,author,published_at,sources(name),all_topics:article_topics(topics(id,name,slug))';

function mapRow(row: RawArticleRow): FeedArticle {
  const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
  const topics: FeedTopic[] = (row.all_topics ?? []).flatMap((entry) => {
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
 * Resolve a topic slug to its id. Returns null when the slug is unknown
 * (callers should treat this as "no matching articles").
 */
async function resolveTopicId(
  supabase: SupabaseClient,
  topicSlug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('topics')
    .select('id')
    .eq('slug', topicSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/**
 * Fetch a single page of approved articles, newest first, optionally
 * filtered to a single topic. Fetches PAGE_SIZE + 1 rows to compute
 * `hasMore` without a separate count query.
 */
export async function fetchFeedPage(
  supabase: SupabaseClient,
  { topicSlug, page }: FeedPageParams,
): Promise<FeedPage> {
  const from = (page - 1) * PAGE_SIZE;
  const to = page * PAGE_SIZE; // inclusive range of PAGE_SIZE + 1 rows

  let query;

  if (topicSlug) {
    const topicId = await resolveTopicId(supabase, topicSlug);
    if (!topicId) {
      return { articles: [], hasMore: false };
    }

    // The inner-join embed used for filtering must have a distinct alias
    // from `all_topics` (also an `article_topics` embed) — PostgREST
    // silently drops the `.eq('article_topics.topic_id', ...)` filter
    // (and empties the other embed) when two embeds of the same
    // relationship share its default name. See probe evidence in the
    // task report.
    query = supabase
      .from('articles')
      .select(`${ARTICLE_SELECT},filter_topic:article_topics!inner(topic_id)`)
      .eq('status', 'approved')
      .eq('filter_topic.topic_id', topicId);
  } else {
    query = supabase.from('articles').select(ARTICLE_SELECT).eq('status', 'approved');
  }

  const { data, error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawArticleRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const articles = rows.slice(0, PAGE_SIZE).map(mapRow);

  return { articles, hasMore };
}

export interface FeedTopicWithId extends FeedTopic {
  id: string;
}

/**
 * All topics that have at least one approved article, for the feed's
 * chip bar. Counts are not required this phase, so this returns a
 * plain distinct topic list.
 */
export async function fetchTopicsWithCounts(
  supabase: SupabaseClient,
): Promise<FeedTopicWithId[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('id,name,slug,article_topics!inner(article_id,articles!inner(status))')
    .eq('article_topics.articles.status', 'approved');

  if (error) throw new Error(error.message);

  const seen = new Map<string, FeedTopicWithId>();
  for (const row of (data ?? []) as unknown as FeedTopicWithId[]) {
    if (!seen.has(row.id)) {
      seen.set(row.id, { id: row.id, name: row.name, slug: row.slug });
    }
  }

  return Array.from(seen.values());
}
