import { describe, it, expect } from 'vitest';
import { generateInviteCode, squadSlug, parseArticleRef } from './squads';

describe('generateInviteCode', () => {
  it('is 16 characters long', () => {
    expect(generateInviteCode()).toHaveLength(16);
  });

  it('only contains characters from the a-z2-7 alphabet', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[a-z2-7]{16}$/);
  });

  it('produces different codes across calls', () => {
    const a = generateInviteCode();
    const b = generateInviteCode();
    expect(a).not.toBe(b);
  });
});

describe('squadSlug', () => {
  it('lowercases and kebabs a simple name with a fixed suffix', () => {
    expect(squadSlug('Growth Team', 'ab12')).toBe('growth-team-ab12');
  });

  it('strips non-alphanumeric characters', () => {
    expect(squadSlug('PM & Design!!', 'ab12')).toBe('pm-design-ab12');
  });

  it('collapses multiple separators into a single dash', () => {
    expect(squadSlug('  Too   Many   Spaces  ', 'ab12')).toBe(
      'too-many-spaces-ab12',
    );
  });

  it('trims leading/trailing dashes before appending the suffix', () => {
    expect(squadSlug('---Weird---', 'ab12')).toBe('weird-ab12');
  });

  it('omits the suffix entirely when explicitly given an empty string', () => {
    expect(squadSlug('No Suffix Here', '')).toBe('no-suffix-here');
  });

  it('caps the base slug length so the full slug does not grow unbounded', () => {
    const longName = 'a'.repeat(100);
    const slug = squadSlug(longName, 'ab12');
    expect(slug.length).toBeLessThanOrEqual(45);
    expect(slug.endsWith('-ab12')).toBe(true);
  });

  it('defaults the suffix to a 4-char string from the invite alphabet when omitted', () => {
    const slug = squadSlug('Some Squad');
    const match = slug.match(/^some-squad(?:-([a-z2-7]{4}))?$/);
    expect(match).not.toBeNull();
  });
});

describe('parseArticleRef', () => {
  const appOrigin = 'https://dailyproduct.example';

  it('returns {articleId} for a bare uuid', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseArticleRef(id, appOrigin)).toEqual({ articleId: id });
  });

  it('returns {articleId} for an app URL with matching origin and /article/<uuid> path', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(
      parseArticleRef(`${appOrigin}/article/${id}`, appOrigin),
    ).toEqual({ articleId: id });
  });

  it('returns {articleId} for a different-origin URL whose pathname still matches /article/<uuid>', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(
      parseArticleRef(`https://other-host.example/article/${id}`, appOrigin),
    ).toEqual({ articleId: id });
  });

  it('returns {url} (trimmed) for an arbitrary http(s) URL', () => {
    expect(
      parseArticleRef('  https://example.com/some/post  ', appOrigin),
    ).toEqual({ url: 'https://example.com/some/post' });
  });

  it('returns {url} for http (non-https) URLs too', () => {
    expect(parseArticleRef('http://example.com/post', appOrigin)).toEqual({
      url: 'http://example.com/post',
    });
  });

  it('returns null for garbage input', () => {
    expect(parseArticleRef('not a url or uuid', appOrigin)).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseArticleRef('', appOrigin)).toBeNull();
    expect(parseArticleRef('   ', appOrigin)).toBeNull();
  });

  it('returns null for a non-http(s) URL scheme', () => {
    expect(parseArticleRef('ftp://example.com/file', appOrigin)).toBeNull();
  });
});
