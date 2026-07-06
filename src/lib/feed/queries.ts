import type { SupabaseClient } from '@supabase/supabase-js';
import { rankByCount } from './rank';

export const PAGE_SIZE = 24;
const HOT_WINDOW_MS = 48 * 60 * 60 * 1000;
const READ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

export type FeedTab = 'new' | 'hot' | 'read' | 'top';

export interface FeedPageParams {
  topicSlug: string | null;
  page: number;
  tab?: FeedTab;
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
 * Base query for approved articles, optionally filtered to a single topic.
 * Returns null when topicSlug is set but doesn't resolve to a real topic
 * (callers should treat this as "no matching articles").
 *
 * NOTE: this must NOT be an async function. A Supabase query builder is
 * thenable, so `async` would collapse the return type down to an awaited
 * response the moment it's returned, losing access to chained builder
 * methods like `.order()`/`.in()` in callers. Resolve the topic id first
 * (a real await, on a plain promise), then build the query synchronously.
 */
function baseArticleQuery(supabase: SupabaseClient, topicId: string | null | undefined) {
  if (topicId === undefined) {
    return supabase.from('articles').select(ARTICLE_SELECT).eq('status', 'approved');
  }
  if (topicId === null) return null;

  // The inner-join embed used for filtering must have a distinct alias
  // from `all_topics` (also an `article_topics` embed) — PostgREST
  // silently drops the `.eq('article_topics.topic_id', ...)` filter
  // (and empties the other embed) when two embeds of the same
  // relationship share its default name. See probe evidence in the
  // task report.
  return supabase
    .from('articles')
    .select(`${ARTICLE_SELECT},filter_topic:article_topics!inner(topic_id)`)
    .eq('status', 'approved')
    .eq('filter_topic.topic_id', topicId);
}

/**
 * Resolve a topicSlug (or null for "no filter") to the value
 * `baseArticleQuery` expects: `undefined` = no filter, `null` = unknown
 * slug (no matching articles), string = resolved topic id.
 */
async function resolveTopicFilter(
  supabase: SupabaseClient,
  topicSlug: string | null,
): Promise<string | null | undefined> {
  if (!topicSlug) return undefined;
  return resolveTopicId(supabase, topicSlug);
}

/**
 * Fetch a single page of approved articles ordered `new` (published_at
 * desc) or `top` (upvote_count desc, published_at desc tiebreak),
 * optionally filtered to a single topic. Fetches PAGE_SIZE + 1 rows to
 * compute `hasMore` without a separate count query.
 */
async function fetchOrderedPage(
  supabase: SupabaseClient,
  { topicSlug, page }: { topicSlug: string | null; page: number },
  order: 'new' | 'top',
): Promise<FeedPage> {
  const from = (page - 1) * PAGE_SIZE;
  const to = page * PAGE_SIZE; // inclusive range of PAGE_SIZE + 1 rows

  const topicId = await resolveTopicFilter(supabase, topicSlug);
  const query = baseArticleQuery(supabase, topicId);
  if (!query) return { articles: [], hasMore: false };

  const ordered =
    order === 'top'
      ? query
          .order('upvote_count', { ascending: false })
          .order('published_at', { ascending: false, nullsFirst: false })
      : query.order('published_at', { ascending: false, nullsFirst: false });

  const { data, error } = await ordered.range(from, to);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawArticleRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const articles = rows.slice(0, PAGE_SIZE).map(mapRow);

  return { articles, hasMore };
}

/**
 * Fetch articles by id (respecting topic filter + approved status) and
 * return them mapped and re-ordered to match `ids`. Articles that don't
 * exist / aren't approved / don't match the topic are silently dropped
 * (e.g. an id from a ranked list that later got unapproved).
 */
async function fetchArticlesByIdsInRankOrder(
  supabase: SupabaseClient,
  topicSlug: string | null,
  ids: string[],
): Promise<FeedArticle[]> {
  if (ids.length === 0) return [];

  const topicId = await resolveTopicFilter(supabase, topicSlug);
  const query = baseArticleQuery(supabase, topicId);
  if (!query) return [];

  const { data, error } = await query.in('id', ids);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawArticleRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids
    .map((id) => byId.get(id))
    .filter((row): row is RawArticleRow => row !== undefined)
    .map(mapRow);
}

/**
 * Rank + paginate the "Hot" (recent upvotes) or "Most Read" (distinct
 * readers, 7d) tabs.
 *
 * Two-step aggregate query, fine at MVP scale: pull raw interaction rows
 * inside the time window, rank article ids in JS via `rankByCount`, then
 * fetch + reorder the articles for the requested page slice.
 *
 * Pagination happens over the ranked id list (not a DB range query), so
 * `hasMore` just checks whether there are more ranked ids past this page's
 * window. If the ranked list is shorter than a full page window, we
 * backfill with `top`-ordered articles (upvote_count desc) excluding
 * already-ranked ids, so a tab never looks sparser than it needs to when
 * the interaction data is thin — this trades a little rank purity for a
 * page that's actually full. Boundary exactness (e.g. hasMore off-by-one
 * around the backfill/window edge) is not critical here; ordering
 * correctness is what matters.
 */
async function fetchRankedPage(
  supabase: SupabaseClient,
  { topicSlug, page, tab }: { topicSlug: string | null; page: number; tab: 'hot' | 'read' },
): Promise<FeedPage> {
  const rankedIds = await fetchRankedIds(supabase, tab);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE; // exclusive upper bound for a PAGE_SIZE + 1 lookahead slice

  let pageIds = rankedIds.slice(from, to);
  const rankedHasMore = rankedIds.length > to;

  // Backfill when this page's ranked-id slice doesn't fill a full
  // lookahead window (PAGE_SIZE + 1) — top up with `top`-ordered articles
  // excluding ids already ranked (anywhere in the full ranked list, not
  // just this page, to avoid duplicates across pages). Fetch one extra
  // beyond what's needed so its presence alone tells us `hasMore`.
  let hasMore = rankedHasMore;
  if (pageIds.length < PAGE_SIZE + 1 && !rankedHasMore) {
    const need = PAGE_SIZE + 1 - pageIds.length;
    const backfill = await fetchTopBackfillIds(supabase, topicSlug, rankedIds, need);
    hasMore = pageIds.length + backfill.length > PAGE_SIZE;
    pageIds = pageIds.concat(backfill);
  }

  const pageSlice = pageIds.slice(0, PAGE_SIZE);

  const articles = await fetchArticlesByIdsInRankOrder(supabase, topicSlug, pageSlice);

  return { articles, hasMore };
}

/** Fetch raw interaction rows for the tab's window and rank article ids. */
async function fetchRankedIds(
  supabase: SupabaseClient,
  tab: 'hot' | 'read',
): Promise<string[]> {
  if (tab === 'hot') {
    const since = new Date(Date.now() - HOT_WINDOW_MS).toISOString();
    const { data, error } = await supabase
      .from('upvotes')
      .select('article_id')
      .gte('created_at', since)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return rankByCount((data ?? []) as { article_id: string }[]);
  }

  // read: distinct users per article over the last 7 days (by read_date).
  const sinceDate = new Date(Date.now() - READ_WINDOW_MS).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('reads')
    .select('article_id,user_id')
    .gte('read_date', sinceDate)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return rankByCount((data ?? []) as { article_id: string; user_id: string }[], 'user_id');
}

/**
 * Backfill ids for a ranked tab page: `top`-ordered (upvote_count desc,
 * published_at desc) articles excluding ids already present in the ranked
 * list, respecting the topic filter + approved status.
 */
async function fetchTopBackfillIds(
  supabase: SupabaseClient,
  topicSlug: string | null,
  excludeIds: string[],
  limit: number,
): Promise<string[]> {
  const topicId = await resolveTopicFilter(supabase, topicSlug);
  const query = baseArticleQuery(supabase, topicId);
  if (!query) return [];

  let withExclusion = query;
  if (excludeIds.length > 0) {
    withExclusion = withExclusion.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await withExclusion
    .order('upvote_count', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RawArticleRow[]).map((row) => row.id);
}

/**
 * Fetch a single page of approved articles, optionally filtered to a
 * single topic, ordered per `tab`:
 * - new (default): published_at desc.
 * - top: upvote_count desc, published_at desc tiebreak.
 * - hot: ranked by upvotes in the last 48h (raw event count).
 * - read: ranked by distinct readers in the last 7 days.
 */
export async function fetchFeedPage(
  supabase: SupabaseClient,
  { topicSlug, page, tab = 'new' }: FeedPageParams,
): Promise<FeedPage> {
  if (tab === 'hot' || tab === 'read') {
    return fetchRankedPage(supabase, { topicSlug, page, tab });
  }
  return fetchOrderedPage(supabase, { topicSlug, page }, tab);
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
