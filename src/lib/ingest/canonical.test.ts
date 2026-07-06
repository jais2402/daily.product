import { describe, it, expect } from 'vitest';
import { canonicalizeUrl } from './canonical';

describe('canonicalizeUrl', () => {
  it('lowercases host and strips hash', () => {
    expect(canonicalizeUrl('https://Example.COM/Post#section')).toBe(
      'https://example.com/Post',
    );
  });
  it('strips tracking params but keeps meaningful ones', () => {
    expect(
      canonicalizeUrl(
        'https://a.com/p?utm_source=x&utm_medium=y&id=7&ref=tw&fbclid=z',
      ),
    ).toBe('https://a.com/p?id=7');
  });
  it('removes trailing slash on paths (not root)', () => {
    expect(canonicalizeUrl('https://a.com/post/')).toBe('https://a.com/post');
    expect(canonicalizeUrl('https://a.com/')).toBe('https://a.com/');
  });
  it('drops default ports', () => {
    expect(canonicalizeUrl('https://a.com:443/x')).toBe('https://a.com/x');
    expect(canonicalizeUrl('http://a.com:80/x')).toBe('http://a.com/x');
  });
  it('sorts query params for stable comparison', () => {
    expect(canonicalizeUrl('https://a.com/p?b=2&a=1')).toBe(
      'https://a.com/p?a=1&b=2',
    );
  });
  it('returns null for garbage and non-http schemes', () => {
    expect(canonicalizeUrl('not a url')).toBeNull();
    expect(canonicalizeUrl('ftp://a.com/x')).toBeNull();
    expect(canonicalizeUrl('javascript:alert(1)')).toBeNull();
  });
  it('orders repeated params by value for stability', () => {
    expect(canonicalizeUrl('https://a.com/p?tag=b&tag=a')).toBe(
      canonicalizeUrl('https://a.com/p?tag=a&tag=b'),
    );
  });
  it('uses ordinal comparison for locale-independent sorting', () => {
    expect(canonicalizeUrl('https://a.com/p?b=2&a=1')).toBe(
      canonicalizeUrl('https://a.com/p?a=1&b=2'),
    );
  });
  it('strips userinfo credentials', () => {
    expect(canonicalizeUrl('https://user:pass@example.com/x')).toBe(
      'https://example.com/x',
    );
  });
});
