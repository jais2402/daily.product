import { describe, it, expect } from 'vitest';
import { isValidAdminKey } from './gate';

describe('isValidAdminKey', () => {
  it('accepts the exact secret', () => {
    expect(isValidAdminKey('s3cret', 's3cret')).toBe(true);
  });
  it('rejects wrong, empty, and undefined values', () => {
    expect(isValidAdminKey('nope', 's3cret')).toBe(false);
    expect(isValidAdminKey('', 's3cret')).toBe(false);
    expect(isValidAdminKey(undefined, 's3cret')).toBe(false);
  });
  it('rejects everything when the secret is unset or empty (fail closed)', () => {
    expect(isValidAdminKey('anything', undefined)).toBe(false);
    expect(isValidAdminKey('', '')).toBe(false);
  });
});
