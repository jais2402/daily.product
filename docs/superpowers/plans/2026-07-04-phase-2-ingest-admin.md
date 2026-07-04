# Daily.Product Phase 2: Ingest + Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RSS content flows into the database daily via a cron-protected ingest route, and an admin (behind a temporary secret gate) approves, tags, or rejects pending articles and manages sources.

**Architecture:** Pure logic (canonicalization, feed parsing) lives in `src/lib/ingest/` with unit tests and no network/DB coupling. The orchestrator composes them and talks to Supabase through `createAdminSupabase()`. `/admin` is server-rendered, gated by an `ADMIN_SECRET` cookie (middleware), and mutates via server actions — the gate swaps to `is_admin` RLS in Phase 4.

**Tech Stack:** existing Phase 1 stack + `rss-parser`.

## Global Constraints

- Component gate: built → tested → reviewed → feedback fixed → deployed (PLAN.md).
- Modular: each file one responsibility. Pure functions in `src/lib/`, side effects at the edges.
- Exported client factories from Phase 1 are the only DB entry points: `createAdminSupabase()` (server-only), `createServerSupabase()`, `createBrowserSupabase()`.
- `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `CRON_SECRET` are server-only env vars, never `NEXT_PUBLIC_*`.
- `npm test && npm run build` must pass before each task's completing commit.
- Conventional commits. Path alias `@/*` → `src/*`. TDD for all pure logic.
- DB tables/columns are exactly as defined in migrations 001–002 (articles: url unique, title, summary, image_url, author, source_id, published_at, status pending/approved/rejected, approved_at; sources: name, site_url, feed_url unique, status active/paused, last_fetched_at, last_error, consecutive_failures).
- Ingest must never let one broken source abort the run; 5 consecutive failures auto-pauses a source.

---

### Task 1: URL canonicalization lib (TDD)

**Files:**
- Create: `src/lib/ingest/canonical.ts`, `src/lib/ingest/canonical.test.ts`

**Interfaces:**
- Produces: `canonicalizeUrl(raw: string): string | null` — null for unparseable/non-http(s) URLs. Used by Task 3 (dedupe) and stored in `articles.url`.

- [ ] **Step 1: Failing tests** — `src/lib/ingest/canonical.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canonicalizeUrl } from './canonical';

describe('canonicalizeUrl', () => {
  it('lowercases host and strips hash', () => {
    expect(canonicalizeUrl('https://Example.COM/Post#section')).toBe(
      'https://example.com/Post',
    );
  });
  it('strips tracking params but keeps meaningful ones', () => {
    expect(
      canonicalizeUrl(
        'https://a.com/p?utm_source=x&utm_medium=y&id=7&ref=tw&fbclid=z',
      ),
    ).toBe('https://a.com/p?id=7');
  });
  it('removes trailing slash on paths (not root)', () => {
    expect(canonicalizeUrl('https://a.com/post/')).toBe('https://a.com/post');
    expect(canonicalizeUrl('https://a.com/')).toBe('https://a.com/');
  });
  it('drops default ports', () => {
    expect(canonicalizeUrl('https://a.com:443/x')).toBe('https://a.com/x');
    expect(canonicalizeUrl('http://a.com:80/x')).toBe('http://a.com/x');
  });
  it('sorts query params for stable comparison', () => {
    expect(canonicalizeUrl('https://a.com/p?b=2&a=1')).toBe(
      'https://a.com/p?a=1&b=2',
    );
  });
  it('returns null for garbage and non-http schemes', () => {
    expect(canonicalizeUrl('not a url')).toBeNull();
    expect(canonicalizeUrl('ftp://a.com/x')).toBeNull();
    expect(canonicalizeUrl('javascript:alert(1)')).toBeNull();
  });
});
```

- [ ] **Step 2: Run** — `npm test -- canonical` → FAIL (module not found).
- [ ] **Step 3: Implement** — `src/lib/ingest/canonical.ts`:

```ts
const TRACKING_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'ref','fbclid','gclid','mc_cid','mc_eid','igshid','source',
]);

export function canonicalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === 'https:' && url.port === '443') ||
    (url.protocol === 'http:' && url.port === '80')
  ) {
    url.port = '';
  }

  const kept = [...url.searchParams.entries()]
    .filter(([k]) => !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [k, v] of kept) url.searchParams.append(k, v);

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}
```

- [ ] **Step 4: Run** — `npm test -- canonical` → PASS (6/6).
- [ ] **Step 5: Commit** — `git add src/lib/ingest && git commit -m "feat: url canonicalization for article dedupe"`

---

### Task 2: Feed parsing module (TDD, no network)

**Files:**
- Create: `src/lib/ingest/feed.ts`, `src/lib/ingest/feed.test.ts`, `src/lib/ingest/fixtures/sample-rss.xml`, `src/lib/ingest/fixtures/sample-atom.xml`

**Interfaces:**
- Consumes: `canonicalizeUrl` (Task 1).
- Produces: `parseFeed(xml: string): Promise<FeedItem[]>` and `type FeedItem = { url: string; title: string; excerpt: string | null; imageUrl: string | null; author: string | null; publishedAt: string | null }`. Task 3 consumes both.

- [ ] **Step 1: Install** — `npm install rss-parser`
- [ ] **Step 2: Fixtures** — `src/lib/ingest/fixtures/sample-rss.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>PM Blog</title>
    <item>
      <title>How to prioritize</title>
      <link>https://pmblog.com/prioritize/?utm_source=rss</link>
      <description><![CDATA[<p>A framework for <b>prioritizing</b> features.</p>]]></description>
      <dc:creator>Jane Doe</dc:creator>
      <pubDate>Wed, 01 Jul 2026 10:00:00 GMT</pubDate>
      <media:content url="https://pmblog.com/img/prio.png" medium="image"/>
    </item>
    <item>
      <title>Broken item</title>
      <link>not-a-url</link>
    </item>
  </channel>
</rss>
```

`src/lib/ingest/fixtures/sample-atom.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Design Weekly</title>
  <entry>
    <title>Tokens at scale</title>
    <link href="https://designweekly.io/tokens"/>
    <summary>Managing design tokens across platforms.</summary>
    <author><name>Sam Lee</name></author>
    <updated>2026-06-28T09:00:00Z</updated>
  </entry>
</feed>
```

- [ ] **Step 3: Failing tests** — `src/lib/ingest/feed.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFeed } from './feed';

const rss = readFileSync(join(__dirname, 'fixtures/sample-rss.xml'), 'utf8');
const atom = readFileSync(join(__dirname, 'fixtures/sample-atom.xml'), 'utf8');

describe('parseFeed', () => {
  it('parses RSS items with canonical urls and plain-text excerpts', async () => {
    const items = await parseFeed(rss);
    expect(items).toHaveLength(1); // broken item dropped
    expect(items[0]).toEqual({
      url: 'https://pmblog.com/prioritize',
      title: 'How to prioritize',
      excerpt: 'A framework for prioritizing features.',
      imageUrl: 'https://pmblog.com/img/prio.png',
      author: 'Jane Doe',
      publishedAt: '2026-07-01T10:00:00.000Z',
    });
  });
  it('parses Atom feeds', async () => {
    const items = await parseFeed(atom);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://designweekly.io/tokens');
    expect(items[0].author).toBe('Sam Lee');
  });
  it('rejects invalid XML', async () => {
    await expect(parseFeed('<not-xml')).rejects.toThrow();
  });
});
```

- [ ] **Step 4: Run** — `npm test -- feed` → FAIL.
- [ ] **Step 5: Implement** — `src/lib/ingest/feed.ts`:

```ts
import Parser from 'rss-parser';
import { canonicalizeUrl } from './canonical';

export type FeedItem = {
  url: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
};

type CustomItem = {
  media?: { $?: { url?: string } };
  'media:content'?: { $?: { url?: string } };
};

const parser = new Parser<Record<string, never>, CustomItem>({
  customFields: { item: [['media:content', 'media']] },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXCERPT_MAX = 300;

export async function parseFeed(xml: string): Promise<FeedItem[]> {
  const feed = await parser.parseString(xml);
  const items: FeedItem[] = [];
  for (const item of feed.items ?? []) {
    const url = item.link ? canonicalizeUrl(item.link) : null;
    if (!url || !item.title) continue;

    const rawExcerpt = item.contentSnippet || item.content || item.summary || '';
    const excerpt = rawExcerpt ? stripHtml(rawExcerpt).slice(0, EXCERPT_MAX) : null;

    const media = item.media?.$?.url ?? null;
    const enclosure = item.enclosure?.url ?? null;

    let publishedAt: string | null = null;
    if (item.isoDate) publishedAt = item.isoDate;
    else if (item.pubDate) {
      const d = new Date(item.pubDate);
      publishedAt = isNaN(d.getTime()) ? null : d.toISOString();
    }

    items.push({
      url,
      title: item.title.trim(),
      excerpt: excerpt || null,
      imageUrl: media || enclosure,
      author: item.creator?.trim() || null,
      publishedAt,
    });
  }
  return items;
}
```

- [ ] **Step 6: Run** — `npm test -- feed` → PASS. Adjust only test expectations that reflect rss-parser's actual field mapping if a fixture assumption is wrong (e.g. atom author extraction) — the contract (FeedItem shape, canonical url, dropped invalid items) must not change.
- [ ] **Step 7: Full suite + commit** — `npm test && npm run build`, then `git add -A && git commit -m "feat: rss/atom feed parsing to FeedItem contract"`

---

### Task 3: Ingest orchestrator (TDD with injected deps)

**Files:**
- Create: `src/lib/ingest/run.ts`, `src/lib/ingest/run.test.ts`

**Interfaces:**
- Consumes: `parseFeed`, `FeedItem` (Task 2).
- Produces: `runIngest(deps: IngestDeps): Promise<IngestSummary>` with:

```ts
type SourceRow = { id: string; name: string; feed_url: string; consecutive_failures: number };
type IngestDeps = {
  listActiveSources(): Promise<SourceRow[]>;
  fetchText(url: string): Promise<string>;               // throws on non-2xx
  existingUrls(urls: string[]): Promise<Set<string>>;    // which already exist
  insertPending(articles: NewArticle[]): Promise<number>; // returns inserted count
  markSourceResult(id: string, r: { ok: true } | { ok: false; error: string; failures: number; pause: boolean }): Promise<void>;
};
type NewArticle = { source_id: string; url: string; title: string; summary: string | null; image_url: string | null; author: string | null; published_at: string | null };
type IngestSummary = { sources: number; fetched: number; inserted: number; failed: { name: string; error: string }[] };
```

Task 4 wires these deps to Supabase; tests here use in-memory fakes (real behavior, no mocks of the unit under test).

- [ ] **Step 1: Failing tests** — `src/lib/ingest/run.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runIngest, type IngestDeps } from './run';

const rss = readFileSync(join(__dirname, 'fixtures/sample-rss.xml'), 'utf8');

function makeDeps(overrides: Partial<IngestDeps> = {}) {
  const inserted: unknown[] = [];
  const sourceResults: Record<string, unknown> = {};
  const deps: IngestDeps = {
    listActiveSources: async () => [
      { id: 's1', name: 'PM Blog', feed_url: 'https://pmblog.com/rss', consecutive_failures: 0 },
    ],
    fetchText: async () => rss,
    existingUrls: async () => new Set(),
    insertPending: async (rows) => { inserted.push(...rows); return rows.length; },
    markSourceResult: async (id, r) => { sourceResults[id] = r; },
    ...overrides,
  };
  return { deps, inserted, sourceResults };
}

describe('runIngest', () => {
  it('inserts new articles as pending and marks source ok', async () => {
    const { deps, inserted, sourceResults } = makeDeps();
    const summary = await runIngest(deps);
    expect(summary).toMatchObject({ sources: 1, fetched: 1, inserted: 1, failed: [] });
    expect(inserted[0]).toMatchObject({
      source_id: 's1',
      url: 'https://pmblog.com/prioritize',
      title: 'How to prioritize',
    });
    expect(sourceResults['s1']).toEqual({ ok: true });
  });

  it('skips articles that already exist', async () => {
    const { deps } = makeDeps({
      existingUrls: async () => new Set(['https://pmblog.com/prioritize']),
    });
    const summary = await runIngest(deps);
    expect(summary.inserted).toBe(0);
  });

  it('one failing source never aborts the run and increments failures', async () => {
    const { deps, sourceResults } = makeDeps({
      listActiveSources: async () => [
        { id: 'bad', name: 'Broken', feed_url: 'https://x.com/rss', consecutive_failures: 3 },
        { id: 's1', name: 'PM Blog', feed_url: 'https://pmblog.com/rss', consecutive_failures: 0 },
      ],
      fetchText: async (url) => {
        if (url === 'https://x.com/rss') throw new Error('HTTP 500');
        return rss;
      },
    });
    const summary = await runIngest(deps);
    expect(summary.inserted).toBe(1);
    expect(summary.failed).toEqual([{ name: 'Broken', error: 'HTTP 500' }]);
    expect(sourceResults['bad']).toEqual({ ok: false, error: 'HTTP 500', failures: 4, pause: false });
  });

  it('pauses a source at 5 consecutive failures', async () => {
    const { deps, sourceResults } = makeDeps({
      listActiveSources: async () => [
        { id: 'bad', name: 'Broken', feed_url: 'https://x.com/rss', consecutive_failures: 4 },
      ],
      fetchText: async () => { throw new Error('timeout'); },
    });
    await runIngest(deps);
    expect(sourceResults['bad']).toEqual({ ok: false, error: 'timeout', failures: 5, pause: true });
  });
});
```

- [ ] **Step 2: Run** — `npm test -- run` → FAIL.
- [ ] **Step 3: Implement** — `src/lib/ingest/run.ts`:

```ts
import { parseFeed } from './feed';

export const MAX_CONSECUTIVE_FAILURES = 5;

export type SourceRow = {
  id: string; name: string; feed_url: string; consecutive_failures: number;
};
export type NewArticle = {
  source_id: string; url: string; title: string; summary: string | null;
  image_url: string | null; author: string | null; published_at: string | null;
};
export type IngestSummary = {
  sources: number; fetched: number; inserted: number;
  failed: { name: string; error: string }[];
};
export type IngestDeps = {
  listActiveSources(): Promise<SourceRow[]>;
  fetchText(url: string): Promise<string>;
  existingUrls(urls: string[]): Promise<Set<string>>;
  insertPending(articles: NewArticle[]): Promise<number>;
  markSourceResult(
    id: string,
    r: { ok: true } | { ok: false; error: string; failures: number; pause: boolean },
  ): Promise<void>;
};

export async function runIngest(deps: IngestDeps): Promise<IngestSummary> {
  const sources = await deps.listActiveSources();
  const summary: IngestSummary = {
    sources: sources.length, fetched: 0, inserted: 0, failed: [],
  };

  for (const source of sources) {
    try {
      const xml = await deps.fetchText(source.feed_url);
      const items = await parseFeed(xml);
      summary.fetched += 1;

      const urls = items.map((i) => i.url);
      const existing = await deps.existingUrls(urls);
      const fresh = items.filter((i) => !existing.has(i.url));

      if (fresh.length > 0) {
        summary.inserted += await deps.insertPending(
          fresh.map((i) => ({
            source_id: source.id,
            url: i.url,
            title: i.title,
            summary: i.excerpt,
            image_url: i.imageUrl,
            author: i.author,
            published_at: i.publishedAt,
          })),
        );
      }
      await deps.markSourceResult(source.id, { ok: true });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      const failures = source.consecutive_failures + 1;
      summary.failed.push({ name: source.name, error });
      await deps.markSourceResult(source.id, {
        ok: false, error, failures, pause: failures >= MAX_CONSECUTIVE_FAILURES,
      });
    }
  }
  return summary;
}
```

- [ ] **Step 4: Run** — `npm test -- run` → PASS (4/4). Full suite + build.
- [ ] **Step 5: Commit** — `git commit -am "feat: ingest orchestrator with per-source failure isolation"`

---

### Task 4: Supabase deps + `/api/ingest` cron route

**Files:**
- Create: `src/lib/ingest/supabase-deps.ts`, `src/app/api/ingest/route.ts`

**Interfaces:**
- Consumes: `runIngest`, `IngestDeps` (Task 3), `createAdminSupabase` (Phase 1 Task 2).
- Produces: `POST/GET /api/ingest` protected by `Authorization: Bearer ${CRON_SECRET}`; `makeSupabaseIngestDeps()` used by the seed script (Task 7).

- [ ] **Step 1: Implement `src/lib/ingest/supabase-deps.ts`**

```ts
import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { IngestDeps, NewArticle } from './run';

export function makeSupabaseIngestDeps(): IngestDeps {
  const db = createAdminSupabase();
  return {
    async listActiveSources() {
      const { data, error } = await db
        .from('sources')
        .select('id,name,feed_url,consecutive_failures')
        .eq('status', 'active');
      if (error) throw new Error(`listActiveSources: ${error.message}`);
      return data ?? [];
    },
    async fetchText(url) {
      const res = await fetch(url, {
        headers: { 'user-agent': 'DailyProductBot/1.0 (+https://dailyproduct.app)' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    },
    async existingUrls(urls) {
      if (urls.length === 0) return new Set();
      const { data, error } = await db.from('articles').select('url').in('url', urls);
      if (error) throw new Error(`existingUrls: ${error.message}`);
      return new Set((data ?? []).map((r) => r.url));
    },
    async insertPending(articles: NewArticle[]) {
      const { data, error } = await db
        .from('articles')
        .upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
        .select('id');
      if (error) throw new Error(`insertPending: ${error.message}`);
      return data?.length ?? 0;
    },
    async markSourceResult(id, r) {
      const patch = r.ok
        ? { last_fetched_at: new Date().toISOString(), last_error: null, consecutive_failures: 0 }
        : {
            last_fetched_at: new Date().toISOString(),
            last_error: r.error,
            consecutive_failures: r.failures,
            ...(r.pause ? { status: 'paused' as const } : {}),
          };
      const { error } = await db.from('sources').update(patch).eq('id', id);
      if (error) throw new Error(`markSourceResult: ${error.message}`);
    },
  };
}
```

- [ ] **Step 2: Implement `src/app/api/ingest/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { runIngest } from '@/lib/ingest/run';
import { makeSupabaseIngestDeps } from '@/lib/ingest/supabase-deps';

export const maxDuration = 300;

async function handle(request: Request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runIngest(makeSupabaseIngestDeps());
    console.error('[ingest]', JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[ingest] fatal', error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export { handle as GET, handle as POST };
```

- [ ] **Step 3: Verify** — `npm test && npm run build` (route compiles; no unit test — logic is Task 3's, this is wiring). Manual check once env keys exist: `curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/ingest` returns a summary JSON.
- [ ] **Step 4:** Add `CRON_SECRET=` and `ADMIN_SECRET=` lines to `.env.example`.
- [ ] **Step 5: Commit** — `git commit -am "feat: supabase ingest deps and cron-protected ingest route"`

---

### Task 5: Temporary admin gate (TDD for the check)

**Files:**
- Create: `src/lib/admin/gate.ts`, `src/lib/admin/gate.test.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`
- Modify: `src/middleware.ts` (create it — Phase 1's auth middleware was deferred, so this file does not exist yet)

**Interfaces:**
- Produces: `isValidAdminKey(provided: string | undefined, secret: string | undefined): boolean` (pure, constant-time-ish); cookie name `dp_admin`; middleware redirecting unauthenticated `/admin/*` (except `/admin/login`) to `/admin/login`. Swapped for `is_admin` in Phase 4 — keep ALL gate logic in `src/lib/admin/gate.ts` + middleware so the swap is two files.

- [ ] **Step 1: Failing tests** — `src/lib/admin/gate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run** — FAIL. Then implement `src/lib/admin/gate.ts`:

```ts
export const ADMIN_COOKIE = 'dp_admin';

export function isValidAdminKey(
  provided: string | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !provided) return false;
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}
```

Run → PASS.

- [ ] **Step 3: Middleware** — `src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const key = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!isValidAdminKey(key, process.env.ADMIN_SECRET)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
```

- [ ] **Step 4: Login page + action** — `src/app/admin/login/actions.ts`:

```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';

export async function adminLogin(formData: FormData) {
  const key = String(formData.get('key') ?? '');
  if (!isValidAdminKey(key, process.env.ADMIN_SECRET)) {
    redirect('/admin/login?error=1');
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, key, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/admin');
}
```

`src/app/admin/login/page.tsx`:

```tsx
import { adminLogin } from './actions';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      {error && <p className="text-red-600">Wrong key.</p>}
      <form action={adminLogin} className="flex flex-col gap-3">
        <input
          type="password"
          name="key"
          placeholder="Admin key"
          className="rounded-lg border p-3"
          autoFocus
        />
        <button className="rounded-lg bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
          Enter
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 5:** `npm test && npm run build` → pass. Manual: with `ADMIN_SECRET=devkey npm run dev`, `/admin` redirects to login; wrong key shows error; right key sets cookie and redirects (to a 404 for now — Task 6 adds the page).
- [ ] **Step 6: Commit** — `git commit -am "feat: temporary admin secret gate with fail-closed middleware"`

---

### Task 6: Admin — approval queue + sources pages

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx` (queue), `src/app/admin/actions.ts`, `src/app/admin/sources/page.tsx`, `src/app/admin/sources/actions.ts`, `src/lib/admin/queries.ts`

**Interfaces:**
- Consumes: `createAdminSupabase` (all reads/writes — the gate already guards the routes; RLS `is_admin()` can't pass without auth until Phase 4).
- Produces: server actions `approveArticle(id, topicIds)`, `rejectArticle(id)`, `addSource(formData)`, `toggleSource(id)`; `listPending()`, `listSources()`, `listTopics()` in `queries.ts`.

- [ ] **Step 1: Queries module** — `src/lib/admin/queries.ts`:

```ts
import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function listPending() {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('articles')
    .select('id,title,url,summary,image_url,author,published_at,sources(name)')
    .eq('status', 'pending')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSources() {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('sources')
    .select('id,name,site_url,feed_url,status,last_fetched_at,last_error,consecutive_failures')
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTopics() {
  const db = createAdminSupabase();
  const { data, error } = await db.from('topics').select('id,name,slug').order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

- [ ] **Step 2: Queue actions** — `src/app/admin/actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';

const approveSchema = z.object({
  articleId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).min(1).max(5),
});

export async function approveArticle(input: unknown) {
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { error: 'Pick 1-5 topics' };
  const { articleId, topicIds } = parsed.data;
  const db = createAdminSupabase();

  const { error: updateError } = await db
    .from('articles')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', articleId)
    .eq('status', 'pending');
  if (updateError) return { error: updateError.message };

  const { error: topicError } = await db
    .from('article_topics')
    .upsert(topicIds.map((topic_id) => ({ article_id: articleId, topic_id })));
  if (topicError) return { error: topicError.message };

  revalidatePath('/admin');
  return {};
}

export async function rejectArticle(input: unknown) {
  const parsed = z.object({ articleId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: 'Invalid article' };
  const db = createAdminSupabase();
  const { error } = await db
    .from('articles')
    .update({ status: 'rejected' })
    .eq('id', parsed.data.articleId)
    .eq('status', 'pending');
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return {};
}
```

- [ ] **Step 3: Queue page** — `src/app/admin/page.tsx` (server component + a small client child for topic-chip selection per card). Layout `src/app/admin/layout.tsx` adds nav links Queue | Sources. The queue card shows image thumb, title (link out), source name, summary, topic chips (from `listTopics()`), Approve (disabled until ≥1 topic picked) and Reject buttons. Implementer: keep the interactive chip-picker in ONE client component file `src/app/admin/queue-card.tsx` receiving the article + topics as props and calling the two server actions; keep pages themselves server components.
- [ ] **Step 4: Sources actions + page** — `src/app/admin/sources/actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';

const sourceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  site_url: z.string().url(),
  feed_url: z.string().url(),
});

export async function addSource(formData: FormData) {
  const parsed = sourceSchema.safeParse({
    name: formData.get('name'),
    site_url: formData.get('site_url'),
    feed_url: formData.get('feed_url'),
  });
  if (!parsed.success) return { error: 'Invalid source details' };
  const db = createAdminSupabase();
  const { error } = await db.from('sources').insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath('/admin/sources');
  return {};
}

export async function toggleSource(input: unknown) {
  const parsed = z
    .object({ id: z.string().uuid(), to: z.enum(['active', 'paused']) })
    .safeParse(input);
  if (!parsed.success) return { error: 'Invalid toggle' };
  const db = createAdminSupabase();
  const { error } = await db
    .from('sources')
    .update({ status: parsed.data.to, ...(parsed.data.to === 'active' ? { consecutive_failures: 0, last_error: null } : {}) })
    .eq('id', parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath('/admin/sources');
  return {};
}
```

`src/app/admin/sources/page.tsx`: table of sources (name → site link, feed url, status badge, last fetch, failures count red when >0, last_error tooltip/inline) + pause/resume button per row (small client component `source-row-actions.tsx`) + add-source form at top (plain form posting `addSource`).

- [ ] **Step 5:** `npm test && npm run build`. Manual (needs env keys + migrations): visit `/admin`, approve/reject a seeded pending article, add + pause a source.
- [ ] **Step 6: Commit** — `git commit -am "feat: admin approval queue and sources management"`

---

### Task 7: Seed script for initial sources

**Files:**
- Create: `scripts/seed-sources.ts`, `scripts/sources.ts`
- Modify: `package.json` (script `"seed:sources": "tsx scripts/seed-sources.ts"`), devDep `tsx`

**Interfaces:**
- Consumes: env vars directly (runs outside Next).
- Produces: idempotent upsert of the starter source list.

- [ ] **Step 1:** `npm install -D tsx dotenv`
- [ ] **Step 2:** `scripts/sources.ts` — placeholder starter list, EDITED/CONFIRMED BY JAYASURIYA before running:

```ts
export const STARTER_SOURCES = [
  { name: "Lenny's Newsletter", site_url: 'https://www.lennysnewsletter.com', feed_url: 'https://www.lennysnewsletter.com/feed' },
  { name: 'Mind the Product', site_url: 'https://www.mindtheproduct.com', feed_url: 'https://www.mindtheproduct.com/feed/' },
  { name: 'Product Talk (Teresa Torres)', site_url: 'https://www.producttalk.org', feed_url: 'https://www.producttalk.org/feed/' },
  { name: 'SVPG (Marty Cagan)', site_url: 'https://www.svpg.com', feed_url: 'https://www.svpg.com/articles/rss' },
  { name: 'Nielsen Norman Group', site_url: 'https://www.nngroup.com', feed_url: 'https://www.nngroup.com/feed/rss/' },
  { name: 'Smashing Magazine', site_url: 'https://www.smashingmagazine.com', feed_url: 'https://www.smashingmagazine.com/feed/' },
  { name: 'UX Collective', site_url: 'https://uxdesign.cc', feed_url: 'https://uxdesign.cc/feed' },
  { name: 'Andrew Chen', site_url: 'https://andrewchen.com', feed_url: 'https://andrewchen.com/feed/' },
  { name: 'Reforge Blog', site_url: 'https://www.reforge.com/blog', feed_url: 'https://www.reforge.com/blog/rss.xml' },
  { name: 'First Round Review', site_url: 'https://review.firstround.com', feed_url: 'https://review.firstround.com/rss.xml' },
];
```

- [ ] **Step 3:** `scripts/seed-sources.ts`:

```ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { STARTER_SOURCES } from './sources';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from('sources')
    .upsert(STARTER_SOURCES, { onConflict: 'feed_url', ignoreDuplicates: true })
    .select('id,name');
  if (error) throw new Error(error.message);
  console.log(`Seeded ${data?.length ?? 0} new sources (existing untouched).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Note: `dotenv/config` reads `.env` — Next uses `.env.local`, so run with `npx dotenv -e .env.local -- tsx scripts/seed-sources.ts` OR simpler: add `"seed:sources": "node --env-file=.env.local node_modules/.bin/tsx scripts/seed-sources.ts"` — implementer picks whichever runs cleanly on Node 20+ and documents it in the script header comment; drop the `dotenv` dep if `--env-file` is used.

- [ ] **Step 4:** Run once env keys exist: `npm run seed:sources` → "Seeded 10 new sources". Re-run → "Seeded 0" (idempotent).
- [ ] **Step 5: Commit** — `git commit -am "feat: idempotent starter source seeding script"`

---

### Task 8: Vercel deploy + cron (user-assisted)

**Files:**
- Create: `vercel.json`

- [ ] **Step 1:** `vercel.json`:

```json
{
  "crons": [{ "path": "/api/ingest", "schedule": "0 3 * * *" }]
}
```

(Vercel invokes cron with `Authorization: Bearer ${CRON_SECRET}` automatically when the env var exists.)

- [ ] **Step 2 (user-assisted):** Create Vercel project from repo; set env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SECRET`, `CRON_SECRET` (generate both secrets with `openssl rand -hex 24`).
- [ ] **Step 3:** Deploy. Live smoke: `/admin/login` gate works; manual `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>.vercel.app/api/ingest` ingests; approve one article in the live queue.
- [ ] **Step 4:** Tick PLAN.md Phase 2 boxes, JOURNAL.md entry, commit `docs: phase 2 shipped`.

---

## Task order & gates

1 → 2 → 3 are pure TDD (no env needed). 4–6 need migrations applied + `.env.local` for manual verification (code compiles regardless). 7–8 are wiring + user-assisted. Per PLAN.md, each task gets: implementer subagent → tests → reviewer subagent → fixes → (deploy at Task 8; earlier tasks deploy together since the Vercel project doesn't exist until then).
