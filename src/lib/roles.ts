export type MemberRole =
  | 'pm'
  | 'apm'
  | 'designer'
  | 'marketer'
  | 'founder'
  | 'developer'
  | 'other';

export type RoleCard = {
  value: MemberRole;
  label: string;
  monogram: string;
  color: string;
  description: string;
};

// The six design cards from the handoff (§2) / plan Global Constraints.
// `other` is a valid enum value but intentionally has no card.
export const ROLES: RoleCard[] = [
  {
    value: 'pm',
    label: 'Product Manager',
    monogram: 'PM',
    color: '#8b7cf8',
    description: 'Roadmaps, specs, prioritization',
  },
  {
    value: 'apm',
    label: 'Associate PM',
    monogram: 'APM',
    color: '#6ea8fe',
    description: 'Learning the craft',
  },
  {
    value: 'designer',
    label: 'Product Designer',
    monogram: 'PD',
    color: '#34d399',
    description: 'UX, UI, prototyping',
  },
  {
    value: 'marketer',
    label: 'Product Marketer',
    monogram: 'PMM',
    color: '#f6a723',
    description: 'GTM, positioning',
  },
  {
    value: 'founder',
    label: 'Founder / CPO',
    monogram: 'F',
    color: '#ff7a59',
    description: '0-to-1, product vision',
  },
  {
    value: 'developer',
    label: 'Developer',
    monogram: 'DEV',
    color: '#e879f9',
    description: 'Building the product',
  },
];

// Default topic slugs per role, drawn from the live 13-topic catalog
// (supabase/migrations/001_identity.sql).
const DEFAULTS: Record<MemberRole, string[]> = {
  pm: ['product-management', 'product-strategy', 'analytics-data'],
  apm: ['product-management', 'career', 'user-research'],
  designer: ['product-design', 'user-research', 'technology'],
  marketer: ['growth', 'product-strategy', 'analytics-data'],
  founder: ['startups-founding', 'product-strategy', 'growth'],
  developer: ['technology', 'ai', 'startups-founding'],
  other: ['product-management', 'technology'],
};

export function defaultTopicSlugsForRole(role: MemberRole): string[] {
  return DEFAULTS[role];
}
