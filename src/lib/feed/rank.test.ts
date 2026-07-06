import { describe, it, expect } from 'vitest';
import { rankByCount, composeRankedPage } from './rank';

describe('rankByCount', () => {
  it('ranks article ids by descending row count', () => {
    const rows = [
      { article_id: 'a' },
      { article_id: 'b' },
      { article_id: 'a' },
      { article_id: 'c' },
      { article_id: 'a' },
      { article_id: 'b' },
    ];
    // a: 3, b: 2, c: 1
    expect(rankByCount(rows)).toEqual(['a', 'b', 'c']);
  });

  it('counts distinct user_id per article when distinctBy is user_id', () => {
    const rows = [
      { article_id: 'a', user_id: 'u1' },
      { article_id: 'a', user_id: 'u1' },
      { article_id: 'a', user_id: 'u1' }, // same user, 3 reads — counts once
      { article_id: 'b', user_id: 'u1' },
      { article_id: 'b', user_id: 'u2' },
    ];
    // a: 1 distinct user, b: 2 distinct users
    expect(rankByCount(rows, 'user_id')).toEqual(['b', 'a']);
  });

  it('breaks ties by first-appearance order', () => {
    const rows = [
      { article_id: 'z' },
      { article_id: 'a' },
      { article_id: 'm' },
    ];
    // all counts equal (1) — order should follow first appearance
    expect(rankByCount(rows)).toEqual(['z', 'a', 'm']);
  });

  it('returns an empty array for empty input', () => {
    expect(rankByCount([])).toEqual([]);
  });
});

describe('composeRankedPage', () => {
  it('produces disjoint pages when the ranked list is sparse and backfill fills the rest', () => {
    // Sparse ranked list (current reality: few/no interactions) — most of
    // each page comes from backfill. Page 1 and page 2 must not overlap.
    const rankedIds = ['r1', 'r2'];
    const backfillIds = Array.from({ length: 20 }, (_, i) => `b${i}`);
    const pageSize = 5;

    const page1 = composeRankedPage(rankedIds, backfillIds, 1, pageSize);
    const page2 = composeRankedPage(rankedIds, backfillIds, 2, pageSize);

    expect(page1.ids).toEqual(['r1', 'r2', 'b0', 'b1', 'b2']);
    expect(page2.ids).toEqual(['b3', 'b4', 'b5', 'b6', 'b7']);

    const overlap = page1.ids.filter((id) => page2.ids.includes(id));
    expect(overlap).toEqual([]);
  });

  it('handles the boundary where the ranked list exactly fills page 1', () => {
    const rankedIds = ['r1', 'r2', 'r3', 'r4', 'r5'];
    const backfillIds = ['b0', 'b1', 'b2'];
    const pageSize = 5;

    const page1 = composeRankedPage(rankedIds, backfillIds, 1, pageSize);
    const page2 = composeRankedPage(rankedIds, backfillIds, 2, pageSize);

    expect(page1.ids).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    expect(page1.hasMore).toBe(true);
    expect(page2.ids).toEqual(['b0', 'b1', 'b2']);
    expect(page2.hasMore).toBe(false);
  });

  it('sets hasMore=true when combined length is exactly one more than the page boundary', () => {
    const rankedIds = ['r1', 'r2'];
    const backfillIds = ['b0', 'b1', 'b2', 'b3']; // combined length 6, pageSize 5
    const result = composeRankedPage(rankedIds, backfillIds, 1, 5);
    expect(result.ids).toEqual(['r1', 'r2', 'b0', 'b1', 'b2']);
    expect(result.hasMore).toBe(true);
  });

  it('sets hasMore=false when combined length exactly equals the page boundary', () => {
    const rankedIds = ['r1', 'r2'];
    const backfillIds = ['b0', 'b1', 'b2']; // combined length 5, pageSize 5
    const result = composeRankedPage(rankedIds, backfillIds, 1, 5);
    expect(result.ids).toEqual(['r1', 'r2', 'b0', 'b1', 'b2']);
    expect(result.hasMore).toBe(false);
  });

  it('defensively dedupes when backfill contains an id already in rankedIds', () => {
    const rankedIds = ['r1', 'r2'];
    // 'r1' leaked into backfill (shouldn't happen upstream, but guard anyway)
    const backfillIds = ['r1', 'b0', 'b1', 'b2'];
    const result = composeRankedPage(rankedIds, backfillIds, 1, 5);
    expect(result.ids).toEqual(['r1', 'r2', 'b0', 'b1', 'b2']);
    expect(result.hasMore).toBe(false);
  });

  it('returns an empty page with hasMore=false when both lists are empty', () => {
    const result = composeRankedPage([], [], 1, 5);
    expect(result.ids).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});
