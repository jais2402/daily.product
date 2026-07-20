import { describe, it, expect } from 'vitest';
import { parseFeedParams } from './params';

describe('parseFeedParams', () => {
  it('defaults to page 1, no topic, tab new', () => {
    expect(parseFeedParams({})).toEqual({ topicSlug: null, page: 1, tab: 'new', q: null });
  });
  it('accepts valid topic slug and page', () => {
    expect(parseFeedParams({ topic: 'ai', page: '3' })).toEqual({
      topicSlug: 'ai',
      page: 3,
      tab: 'new',
      q: null,
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

  describe('q (search)', () => {
    it('accepts a valid query', () => {
      expect(parseFeedParams({ q: 'react hooks' }).q).toBe('react hooks');
    });
    it('strips injection-unsafe characters (PostgREST .or/.ilike syntax)', () => {
      expect(parseFeedParams({ q: 'react,()% hooks' }).q).toBe('react hooks');
    });
    it('collapses inner whitespace and trims', () => {
      expect(parseFeedParams({ q: '  react    hooks  ' }).q).toBe('react hooks');
    });
    it('caps at 60 characters', () => {
      const raw = 'a'.repeat(61);
      const q = parseFeedParams({ q: raw }).q;
      expect(q).toBe('a'.repeat(60));
      expect(q?.length).toBe(60);
    });
    it('returns null for a single character (below the 2-char floor)', () => {
      expect(parseFeedParams({ q: 'a' }).q).toBeNull();
    });
    it('returns null when q is missing', () => {
      expect(parseFeedParams({}).q).toBeNull();
    });
  });
});
