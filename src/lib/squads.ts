/**
 * Pure squad helpers: invite code generation, slug derivation, and article
 * reference parsing for the share composer. No I/O — server actions own
 * DB access and auth; these are unit-testable in isolation.
 */

const INVITE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'; // a-z2-7 (base32-ish, no 0/1/8/9)
const INVITE_CODE_LENGTH = 16;

/** 16-char lowercase [a-z2-7] invite code, generated via crypto.getRandomValues. */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

const SLUG_BASE_MAX_LENGTH = 40;

/**
 * Lowercase kebab-case slug derived from `name`, with an optional suffix
 * appended as `-<suffix>`. Non-alphanumeric characters become separators;
 * runs of separators collapse to a single dash; leading/trailing dashes are
 * trimmed before the suffix is appended (so the suffix is never orphaned by
 * a trailing dash). The name portion is capped at `SLUG_BASE_MAX_LENGTH`
 * characters (trimmed again after truncation) to keep the whole slug
 * bounded. When `suffix` is omitted, a fresh 4-character string from the
 * invite alphabet is generated so slugs stay unique-ish by default; pass an
 * explicit suffix (including `''`) to disable that and get a deterministic,
 * testable result.
 */
export function squadSlug(name: string, suffix?: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_BASE_MAX_LENGTH)
    .replace(/^-|-$/g, '');

  const resolvedSuffix = suffix === undefined ? randomSuffix() : suffix;
  return resolvedSuffix ? `${base}-${resolvedSuffix}` : base;
}

function randomSuffix(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return out;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ArticleRef = { articleId: string } | { url: string };

/**
 * Resolve free-text pasted into the share composer into either an article
 * id (bare uuid, or an `/article/<uuid>` path on any host — matching by
 * path only means a link copied from a preview/staging domain still
 * resolves) or a plain URL to look up by exact match. Returns null for
 * anything that isn't a uuid or an http(s) URL.
 */
export function parseArticleRef(
  input: string,
  appOrigin: string,
): ArticleRef | null {
  void appOrigin; // origin is intentionally not required to match — path-only check below
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (UUID_RE.test(trimmed)) {
    return { articleId: trimmed };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const pathMatch = url.pathname.match(/^\/article\/([0-9a-f-]{36})$/i);
  if (pathMatch && UUID_RE.test(pathMatch[1])) {
    return { articleId: pathMatch[1] };
  }

  return { url: trimmed };
}
