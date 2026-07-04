import { describe, it, expect } from 'vitest';
import { APP_NAME } from './version';

describe('canary', () => {
  it('runs the test pipeline', () => {
    expect(APP_NAME).toBe('Daily.Product');
  });
});
