const ADJECTIVES = ['Curious','Bold','Quiet','Swift','Bright','Steady','Clever',
  'Honest','Daring','Gentle','Sharp','Patient','Lively','Sunny','Focused',
  'Nimble','Witty','Calm','Eager','Keen'];
const NOUNS = ['Falcon','Otter','Maple','Comet','Harbor','Summit','Lantern',
  'Meadow','Compass','Beacon','Cedar','Drift','Ember','Fjord','Grove',
  'Horizon','Isle','Junction','Kite','Lagoon'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateIdentity(seed?: string): {
  displayName: string;
  avatarSeed: string;
} {
  const s = seed ?? Math.random().toString(36).slice(2, 10);
  const h = hash(s);
  const adjective = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length];
  return { displayName: `${adjective} ${noun}`, avatarSeed: s };
}

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * First whitespace-delimited token of a display name, e.g. "Jaya Kumar" ->
 * "Jaya". Used for the feed's personalized greeting (design-handoff.md §5
 * "Good morning, Jaya 👋") — `null` for an empty/whitespace-only name so
 * callers can fall back to the plain greeting.
 */
export function firstWord(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}
