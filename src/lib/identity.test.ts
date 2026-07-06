import { describe, it, expect } from 'vitest';
import { generateIdentity, avatarUrl } from './identity';

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
