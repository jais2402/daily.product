import { describe, it, expect } from 'vitest';
import { parseFeedParams } from './params';

describe('parseFeedParams', () => {
  it('defaults to page 1, no topic', () => {
    expect(parseFeedParams({})).toEqual({ topicSlug: null, page: 1 });
  });
  it('accepts valid topic slug and page', () => {
    expect(parseFeedParams({ topic: 'ai', page: '3' })).toEqual({ topicSlug: 'ai', page: 3 });
  });
  it('rejects invalid slugs', () => {
    expect(parseFeedParams({ topic: 'AI!' }).topicSlug).toBeNull();
    expect(parseFeedParams({ topic: 'a'.repeat(51) }).topicSlug).toBeNull();
  });
  it('sanitizes page: non-numeric, zero, negative, huge, float', () => {
    expect(parseFeedParams({ page: 'x' }).page).toBe(1);
    expect(parseFeedParams({ page: '0' }).page).toBe(1);
    expect(parseFeedParams({ page: '-2' }).page).toBe(1);
    expect(parseFeedParams({ page: '9999' }).page).toBe(500);
    expect(parseFeedParams({ page: '2.7' }).page).toBe(1);
  });
});
