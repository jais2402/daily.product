import { describe, it, expect } from 'vitest';
import { ROLES, defaultTopicSlugsForRole, type MemberRole } from './roles';

const ALL_ROLES: MemberRole[] = [
  'pm',
  'apm',
  'designer',
  'marketer',
  'founder',
  'developer',
  'other',
];

describe('roles', () => {
  it('has exactly 6 role cards', () => {
    expect(ROLES).toHaveLength(6);
  });

  it('every enum role (including other) has at least 2 default topics', () => {
    for (const role of ALL_ROLES) {
      expect(defaultTopicSlugsForRole(role).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('pm defaults contain product-management', () => {
    expect(defaultTopicSlugsForRole('pm')).toContain('product-management');
  });

  it('every default slug is a valid slug (lowercase, digits, hyphens)', () => {
    for (const role of ALL_ROLES) {
      for (const slug of defaultTopicSlugsForRole(role)) {
        expect(slug).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });
});
