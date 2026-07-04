const TOPIC_SLUG_RE = /^[a-z0-9-]{1,50}$/;
const MAX_PAGE = 500;

export interface FeedParams {
  topicSlug: string | null;
  page: number;
}

/** Pure parser: turns raw (query-string-like) input into safe, bounded feed params. */
export function parseFeedParams(searchParams: {
  topic?: string;
  page?: string;
}): FeedParams {
  const topicSlug =
    searchParams.topic && TOPIC_SLUG_RE.test(searchParams.topic)
      ? searchParams.topic
      : null;

  const page = sanitizePage(searchParams.page);

  return { topicSlug, page };
}

function sanitizePage(raw: string | undefined): number {
  if (raw === undefined) return 1;
  if (!/^-?\d+$/.test(raw)) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_PAGE);
}
