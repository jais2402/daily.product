import { describe, it, expect } from 'vitest';
import { generateIdentity, avatarUrl, firstWord } from './identity';

describe('generateIdentity', () => {
  it('is deterministic for the same seed', () => {
    expect(generateIdentity('abc')).toEqual(generateIdentity('abc'));
  });
  it('produces Adjective Noun format', () => {
    const { displayName } = generateIdentity('abc');
    expect(displayName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
  it('differs across seeds (usually)', () => {
    expect(generateIdentity('a').displayName).not.toBe(generateIdentity('zz9').displayName);
  });
});

describe('avatarUrl', () => {
  it('builds a DiceBear URL from the seed', () => {
    expect(avatarUrl('abc')).toBe(
      'https://api.dicebear.com/9.x/thumbs/svg?seed=abc',
    );
  });
});

describe('firstWord', () => {
  it('returns the first token of a multi-word name', () => {
    expect(firstWord('Jaya Kumar')).toBe('Jaya');
  });

  it('returns the whole name when it is a single word', () => {
    expect(firstWord('Jaya')).toBe('Jaya');
  });

  it('collapses extra internal whitespace', () => {
    expect(firstWord('  Jaya   Kumar  ')).toBe('Jaya');
  });

  it('returns null for an empty string', () => {
    expect(firstWord('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(firstWord('   ')).toBeNull();
  });
});
