import { describe, it, expect } from 'vitest';
import { parseFeedParams } from './params';

describe('parseFeedParams', () => {
  it('defaults to page 1, no topic, tab new', () => {
    expect(parseFeedParams({})).toEqual({ topicSlug: null, page: 1, tab: 'new' });
  });
  it('accepts valid topic slug and page', () => {
    expect(parseFeedParams({ topic: 'ai', page: '3' })).toEqual({
      topicSlug: 'ai',
      page: 3,
      tab: 'new',
    });
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
  it('accepts each valid tab value', () => {
    expect(parseFeedParams({ tab: 'new' }).tab).toBe('new');
    expect(parseFeedParams({ tab: 'hot' }).tab).toBe('hot');
    expect(parseFeedParams({ tab: 'read' }).tab).toBe('read');
    expect(parseFeedParams({ tab: 'top' }).tab).toBe('top');
  });
  it('defaults invalid or missing tab to new', () => {
    expect(parseFeedParams({ tab: 'trending' }).tab).toBe('new');
    expect(parseFeedParams({ tab: '' }).tab).toBe('new');
    expect(parseFeedParams({}).tab).toBe('new');
  });
});
