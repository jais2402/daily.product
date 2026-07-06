export interface CountableRow {
  article_id: string;
  user_id?: string;
}

/**
 * Pure ranking helper for the "Hot" and "Most Read" tabs: given raw
 * interaction rows (upvotes or reads), returns article ids ranked
 * descending by count.
 *
 * - Default: counts every row (raw event count — used for Hot, where a
 *   user can only upvote once anyway, but the shape is generic).
 * - distinctBy: 'user_id': counts distinct user_id per article instead of
 *   raw rows — used for Most Read, where the same user reading an article
 *   3 times in the window should only count once.
 * - Ties are broken by first-appearance order in the input array (stable),
 *   not by article id — the input is assumed to already be in a
 *   reasonable order (e.g. by created_at) from the query.
 */
export function rankByCount(
  rows: CountableRow[],
  distinctBy?: 'user_id',
): string[] {
  const counts = new Map<string, number>();
  const seenPairs = new Set<string>();
  const order: string[] = [];

  for (const row of rows) {
    const { article_id } = row;
    if (!counts.has(article_id)) {
      counts.set(article_id, 0);
      order.push(article_id);
    }

    if (distinctBy === 'user_id') {
      const key = `${article_id}::${row.user_id ?? ''}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
    }

    counts.set(article_id, (counts.get(article_id) ?? 0) + 1);
  }

  return order
    .map((id, index) => ({ id, index, count: counts.get(id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map((entry) => entry.id);
}

export interface ComposedPage {
  ids: string[];
  hasMore: boolean;
}

/**
 * Pure pagination over a ranked-then-backfill id list for the "Hot" and
 * "Most Read" tabs.
 *
 * `backfillIds` is expected to already exclude every id in `rankedIds`
 * (the caller computes this against the FULL ranked list, not just the
 * current page, so backfill content is stable and disjoint across pages —
 * see the bug this fixes: previously backfill only excluded the ranked
 * list, but pagination sliced backfill per-page starting from the same
 * "not in rankedIds" candidate set each time, so a sparse ranked list
 * produced the same backfill articles on every page).
 *
 * This function still defensively dedupes in case a caller passes
 * overlapping lists, so a bad caller can't reintroduce duplicate ids
 * across a single composed page.
 *
 * Conceptually: concatenate rankedIds then backfillIds, then slice the
 * requested page window `[(page-1)*pageSize, page*pageSize)`. `hasMore`
 * is true when the combined (deduped) list extends past this page's
 * upper bound.
 */
export function composeRankedPage(
  rankedIds: string[],
  backfillIds: string[],
  page: number,
  pageSize: number,
): ComposedPage {
  const seen = new Set<string>();
  const combined: string[] = [];

  for (const id of rankedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    combined.push(id);
  }
  for (const id of backfillIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    combined.push(id);
  }

  const from = (page - 1) * pageSize;
  const to = page * pageSize;

  return {
    ids: combined.slice(from, to),
    hasMore: combined.length > to,
  };
}
