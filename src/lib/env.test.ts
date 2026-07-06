import { describe, it, expect } from 'vitest';
import { publicEnvSchema } from './env';

describe('publicEnvSchema', () => {
  it('accepts valid public env', () => {
    expect(
      publicEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }).success,
    ).toBe(true);
  });
  it('rejects missing url', () => {
    expect(
      publicEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' }).success,
    ).toBe(false);
  });
});
