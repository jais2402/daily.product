const TOPIC_SLUG_RE = /^[a-z0-9-]{1,50}$/;
const MAX_PAGE = 500;
const MAX_QUERY_LEN = 60;
const MIN_QUERY_LEN = 2;
// Anything outside this set is stripped: it's the set of characters that
// can't break or inject into the PostgREST `.or()`/`.ilike()` syntax the
// search query gets composed into (commas separate `.or()` conditions,
// parens/`%`/`*` have meaning inside ilike patterns).
const QUERY_UNSAFE_CHAR_RE = /[^a-zA-Z0-9 _-]/g;

export type FeedTab = 'new' | 'hot' | 'read' | 'top';
const FEED_TABS: readonly FeedTab[] = ['new', 'hot', 'read', 'top'];

export interface FeedParams {
  topicSlug: string | null;
  page: number;
  tab: FeedTab;
  q: string | null;
}

/** Pure parser: turns raw (query-string-like) input into safe, bounded feed params. */
export function parseFeedParams(searchParams: {
  topic?: string;
  page?: string;
  tab?: string;
  q?: string;
}): FeedParams {
  const topicSlug =
    searchParams.topic && TOPIC_SLUG_RE.test(searchParams.topic)
      ? searchParams.topic
      : null;

  const page = sanitizePage(searchParams.page);
  const tab = sanitizeTab(searchParams.tab);
  const q = sanitizeQuery(searchParams.q);

  return { topicSlug, page, tab, q };
}

/**
 * Sanitize a raw search query into a safe, bounded string (or null if
 * there's nothing usable left). Pure — the point is PostgREST safety:
 * trim → collapse inner whitespace → strip unsafe chars → cap length →
 * null out anything too short to be a meaningful search term.
 */
function sanitizeQuery(raw: string | undefined): string | null {
  if (!raw) return null;

  const collapsed = raw.trim().replace(/\s+/g, ' ');
  const stripped = collapsed.replace(QUERY_UNSAFE_CHAR_RE, '');
  const capped = stripped.slice(0, MAX_QUERY_LEN);

  return capped.length < MIN_QUERY_LEN ? null : capped;
}

function sanitizeTab(raw: string | undefined): FeedTab {
  if (raw && (FEED_TABS as readonly string[]).includes(raw)) return raw as FeedTab;
  return 'new';
}

function sanitizePage(raw: string | undefined): number {
  if (raw === undefined) return 1;
  if (!/^-?\d+$/.test(raw)) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}
