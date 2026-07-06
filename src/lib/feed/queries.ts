import type { SupabaseClient } from '@supabase/supabase-js';
import { rankByCount, composeRankedPage } from './rank';

export const PAGE_SIZE = 24;
const HOT_WINDOW_MS = 48 * 60 * 60 * 1000;
const READ_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cap on how many top-ordered candidate ids we pull to build the backfill
 * pool for ranked (hot/read) tabs. This bounds the backfill list to a
 * "stable enough" candidate set without paying for an unbounded query —
 * at MVP scale (tens to low hundreds of approved articles) this covers
 * the whole corpus; if the article count grows well past this, deep
 * pages of a sparse ranked tab could theoretically run out of backfill
 * before hitting the true end of the top-ordered list (hasMore would
 * read false a little early). Not a correctness issue for pagination
 * disjointness — just a bound on how deep backfill can page.
 */
const BACKFILL_CANDIDATE_CAP = 500;

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
 * Pagination is computed by the pure `composeRankedPage` helper over two
 * inputs: the ranked id list, and a backfill pool of `top`-ordered ids
 * that excludes every ranked id. Both inputs are the FULL lists (not
 * paged), so the same backfill pool is used to compute every page's
 * slice — this is what keeps pages disjoint. (Previously each page
 * queried backfill fresh, excluding only `rankedIds`, so with a sparse
 * ranked list every page's backfill query returned the same top articles
 * — page 1 and page 2 were identical past the ranked ids.)
 *
 * The backfill pool itself is bounded to `BACKFILL_CANDIDATE_CAP`
 * candidates (see constant doc) rather than being unbounded.
 */
async function fetchRankedPage(
  supabase: SupabaseClient,
  { topicSlug, page, tab }: { topicSlug: string | null; page: number; tab: 'hot' | 'read' },
): Promise<FeedPage> {
  const rankedIds = await fetchRankedIds(supabase, tab);
  const topIds = await fetchTopCandidateIds(supabase, topicSlug, BACKFILL_CANDIDATE_CAP);

  const rankedIdSet = new Set(rankedIds);
  const backfillIds = topIds.filter((id) => !rankedIdSet.has(id));

  const { ids: pageIds, hasMore } = composeRankedPage(rankedIds, backfillIds, page, PAGE_SIZE);

  const articles = await fetchArticlesByIdsInRankOrder(supabase, topicSlug, pageIds);

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
 * Fetch a stable, `top`-ordered (upvote_count desc, published_at desc)
 * candidate id list for backfilling ranked tab pages, respecting the
 * topic filter + approved status. Capped at `limit` (see
 * `BACKFILL_CANDIDATE_CAP`) — this is the FULL candidate pool, not a
 * per-page query, so callers can derive a stable backfill list (minus
 * ranked ids) once and paginate over it without repeating articles
 * across pages.
 */
async function fetchTopCandidateIds(
  supabase: SupabaseClient,
  topicSlug: string | null,
  limit: number,
): Promise<string[]> {
  const topicId = await resolveTopicFilter(supabase, topicSlug);
  const query = baseArticleQuery(supabase, topicId);
  if (!query) return [];

  const { data, error } = await query
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

/**
 * Cap on how many of the user's most-recent read/bookmark ids are pulled to
 * build the exclusion list for recommendations. At MVP interaction volumes
 * this comfortably covers "articles the user has already seen" without an
 * unbounded query; if a user has more than this many reads or bookmarks, the
 * oldest ones stop being excluded (acceptable — recs are a "might like"
 * nice-to-have, not a hard dedup guarantee).
 */
const RECS_EXCLUSION_CAP = 200;

export interface RecommendedArticle {
  id: string;
  title: string;
  source_name: string | null;
  published_at: string | null;
}

interface RecRow {
  id: string;
  title: string;
  published_at: string | null;
  sources: { name: string } | { name: string }[] | null;
}

function mapRecRow(row: RecRow): RecommendedArticle {
  const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
  return {
    id: row.id,
    title: row.title,
    source_name: source?.name ?? null,
    published_at: row.published_at,
  };
}

/** Most recent (capped) article ids a user has read. */
async function fetchRecentReadIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('reads')
    .select('article_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(RECS_EXCLUSION_CAP);
  if (error) throw new Error(error.message);
  return Array.from(
    new Set((data ?? []).map((row) => row.article_id as string)),
  );
}

/** Most recent (capped) article ids a user has bookmarked. */
async function fetchRecentBookmarkIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('article_id,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(RECS_EXCLUSION_CAP);
  if (error) throw new Error(error.message);
  return Array.from(
    new Set((data ?? []).map((row) => row.article_id as string)),
  );
}

/**
 * Recommendations v1 (MVP design spec §5): unread, non-bookmarked approved
 * articles matching the user's chosen topics (`profile_topics`), ranked
 * recency first then upvote_count. Returns a light shape — just what the
 * rail card needs — rather than the full `FeedArticle` mapping, since topics
 * aren't rendered here.
 *
 * Exclusion uses `.not('id', 'in', (...))` with PostgREST's literal list
 * syntax (NOT the `.in()` array helper, which is for inclusion filters).
 * Both id lists are capped at `RECS_EXCLUSION_CAP` (see constant doc) — safe
 * for a `.not(...)` clause of that size. When a list is empty, the `.not()`
 * call is skipped entirely: PostgREST's `not.in.()` (empty parens) is
 * malformed and errors, so an empty exclusion set must omit the clause
 * rather than pass an empty literal list.
 */
export async function fetchRecommendations(
  supabase: SupabaseClient,
  userId: string,
  limit = 4,
): Promise<RecommendedArticle[]> {
  const { data: topicRows, error: topicError } = await supabase
    .from('profile_topics')
    .select('topic_id')
    .eq('profile_id', userId);
  if (topicError) throw new Error(topicError.message);

  const topicIds = (topicRows ?? []).map((row) => row.topic_id as string);
  if (topicIds.length === 0) return [];

  const [readIds, bookmarkIds] = await Promise.all([
    fetchRecentReadIds(supabase, userId),
    fetchRecentBookmarkIds(supabase, userId),
  ]);
  const excludeIds = Array.from(new Set([...readIds, ...bookmarkIds]));

  let query = supabase
    .from('articles')
    .select('id,title,published_at,sources(name),article_topics!inner(topic_id)')
    .eq('status', 'approved')
    .in('article_topics.topic_id', topicIds);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  // The inner join against article_topics can return an article once per
  // matching topic id when it has more than one topic overlapping the
  // user's selections — over-fetch a bit so de-duping below still leaves up
  // to `limit` distinct articles.
  const { data, error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('upvote_count', { ascending: false })
    .limit(limit * 3);
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const rows: RecommendedArticle[] = [];
  for (const row of (data ?? []) as unknown as RecRow[]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(mapRecRow(row));
    if (rows.length === limit) break;
  }
  return rows;
}

interface RecentBookmarkRow {
  articles: RecRow | RecRow[] | null;
}

/**
 * The `limit` most recently bookmarked articles for a user, light shape for
 * the rail's "Recent bookmarks" card. Bookmarks pointing at an article
 * that's since been unapproved are dropped defensively (mirrors
 * /bookmarks page.tsx's fetchBookmarkedArticles).
 */
export async function fetchRecentBookmarks(
  supabase: SupabaseClient,
  userId: string,
  limit = 3,
): Promise<RecommendedArticle[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('articles!inner(id,title,published_at,status,sources(name))')
    .eq('user_id', userId)
    .eq('articles.status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as RecentBookmarkRow[])
    .map((row) => (Array.isArray(row.articles) ? row.articles[0] : row.articles))
    .filter((article): article is RecRow => article != null)
    .map(mapRecRow);
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
