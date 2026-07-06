const TOPIC_SLUG_RE = /^[a-z0-9-]{1,50}$/;
const MAX_PAGE = 500;

export type FeedTab = 'new' | 'hot' | 'read' | 'top';
const FEED_TABS: readonly FeedTab[] = ['new', 'hot', 'read', 'top'];

export interface FeedParams {
  topicSlug: string | null;
  page: number;
  tab: FeedTab;
}

/** Pure parser: turns raw (query-string-like) input into safe, bounded feed params. */
export function parseFeedParams(searchParams: {
  topic?: string;
  page?: string;
  tab?: string;
}): FeedParams {
  const topicSlug =
    searchParams.topic && TOPIC_SLUG_RE.test(searchParams.topic)
      ? searchParams.topic
      : null;

  const page = sanitizePage(searchParams.page);
  const tab = sanitizeTab(searchParams.tab);

  return { topicSlug, page, tab };
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
