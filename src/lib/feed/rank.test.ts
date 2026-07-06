import { describe, it, expect } from 'vitest';
import { rankByCount } from './rank';

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
