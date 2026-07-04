# Daily.Product Phase 3: Public Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone (logged out) can open the site and read the curated feed: a responsive card grid of approved articles, filterable by topic, with a detail view linking out to the original — the product's public face.

**Architecture:** Server-rendered pages using the anon Supabase client (RLS exposes only approved articles). Pure feed-query helpers in `src/lib/feed/` with unit tests; pages are server components; zero client JS beyond what topic-chip links need (they're plain links — no client components required this phase).

**Tech Stack:** existing stack; no new dependencies.

## Global Constraints

- Component gate: built → tested → reviewed → feedback fixed → deployed (PLAN.md).
- Public pages use `createServerSupabase()` (anon key + RLS) — never the admin client. RLS policy "approved articles public" is the security boundary.
- Public pages render logged-out; no forced login (spec §3).
- Feed default sort: `published_at` desc nulls last (spec "New Trends"). Hot News / Most Read / Liked tabs are Phase 5 (need interactions) — do NOT build tab chrome for them yet.
- Read logging is Phase 5 (needs auth): the Read More CTA is a plain external link this phase.
- Article images may be missing → topic-colored placeholder block, never broken img. External links: `target="_blank" rel="noreferrer"`.
- Styling: same neutral, dark-mode-aware Tailwind idiom as /admin and the landing page. Cards: rounded-lg border, image top, source + date, title (2-line clamp), summary (3-line clamp), topic chips.
- `npm test && npm run build` green before each completing commit; conventional commits.
- Dispatch note: implementers/reviewers must do all work themselves (no Agent spawning).

---

### Task 1: Feed query lib (TDD)

**Files:**
- Create: `src/lib/feed/queries.ts`, `src/lib/feed/params.ts`, `src/lib/feed/params.test.ts`

**Interfaces:**
- Produces:
  - `parseFeedParams(searchParams: { topic?: string; page?: string }): { topicSlug: string | null; page: number }` — pure; invalid/malicious values fall back to defaults (page 1, no topic). Page ≥ 1, integer, cap 500. Topic slug must match `/^[a-z0-9-]{1,50}$/` else null.
  - `PAGE_SIZE = 24`.
  - `fetchFeedPage(supabase, { topicSlug, page }): Promise<{ articles: FeedArticle[]; hasMore: boolean }>` where `FeedArticle = { id, url, title, summary, image_url, author, published_at, source_name, topics: { name, slug }[] }`.
  - `fetchTopicsWithCounts(supabase): Promise<{ id, name, slug }[]>` (approved-article topics for the chip bar; plain `topics` list is fine — counts not required this phase).
- `fetchFeedPage` selects `articles` with `sources(name)` and `article_topics(topics(id,name,slug))`, `.eq('status','approved')` explicitly (defense in depth on top of RLS), `.order('published_at', { ascending: false, nullsFirst: false })`, range `[(page-1)*PAGE_SIZE, page*PAGE_SIZE]` (fetch PAGE_SIZE+1 rows; `hasMore = rows.length > PAGE_SIZE`, slice to PAGE_SIZE). Topic filter: when topicSlug set, use `.in('id', subquery-ids)` via a first query on `article_topics` joined to `topics` by slug (two-step: get topic id by slug, then filter with `!inner` join: `article_topics!inner(topic_id)` `.eq('article_topics.topic_id', topicId)`).

- [ ] **Step 1: Failing tests** — `src/lib/feed/params.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFeedParams } from './params';

describe('parseFeedParams', () => {
  it('defaults to page 1, no topic', () => {
    expect(parseFeedParams({})).toEqual({ topicSlug: null, page: 1 });
  });
  it('accepts valid topic slug and page', () => {
    expect(parseFeedParams({ topic: 'ai', page: '3' })).toEqual({ topicSlug: 'ai', page: 3 });
  });
  it('rejects invalid slugs', () => {
    expect(parseFeedParams({ topic: 'AI!' }).topicSlug).toBeNull();
    expect(parseFeedParams({ topic: 'a'.repeat(51) }).topicSlug).toBeNull();
  });
  it('sanitizes page: non-numeric, zero, negative, huge, float', () => {
    expect(parseFeedParams({ page: 'x' }).page).toBe(1);
    expect(parseFeedParams({ page: '0' }).page).toBe(1);
    expect(parseFeedParams({ page: '-2' }).page).toBe(1);
    expect(parseFeedParams({ page: '9999' }).page).toBe(500);
    expect(parseFeedParams({ page: '2.7' }).page).toBe(1);
  });
});
```

- [ ] **Step 2:** RED run, then implement `params.ts` (pure) and `queries.ts` per the interface above; params tests GREEN.
- [ ] **Step 3:** `npm test && npm run build` → commit `feat: feed query lib with sanitized params`.

---

### Task 2: Public feed page + article detail

**Files:**
- Create: `src/app/(public)/feed-card.tsx` (server component), `src/app/article/[id]/page.tsx`
- Modify: `src/app/page.tsx` (replace placeholder with the real feed), `src/app/layout.tsx` (site header: wordmark link home; nothing else this phase)

**Interfaces:**
- Consumes: Task 1's `parseFeedParams`, `fetchFeedPage`, `fetchTopicsWithCounts`, `createServerSupabase`.
- Produces: `/` (feed with `?topic=` + `?page=`), `/article/<id>` detail. Both public, `export const dynamic = 'force-dynamic'`.

- [ ] **Step 1: Home feed page** — server component:
  - `const { topicSlug, page } = parseFeedParams(await searchParams)`
  - Topic chip bar: "All" + every topic, as `<Link href={topic ? `/?topic=${slug}` : '/'}>` chips; active chip filled style.
  - Card grid `grid gap-6 sm:grid-cols-2 lg:grid-cols-3`.
  - `FeedCard`: image (or colored placeholder derived from first topic slug hash), source name + date (e.g. `Jul 4`), title (line-clamp-2) linking to `/article/<id>`, summary (line-clamp-3), topic chips (small, link to `/?topic=`).
  - Pagination: Prev/Next links (`?page=`) shown when applicable (`page > 1` / `hasMore`).
  - Empty state ("Nothing here yet — check back tomorrow") for empty results.
- [ ] **Step 2: Article detail** — `/article/[id]`: fetch single approved article (anon client; RLS hides non-approved; 404 via `notFound()` when absent). Layout: topic chips, title (large), source + author + date, image if present, full summary, prominent "Read the full article ↗" button (`href=url`, `target="_blank" rel="noreferrer"`), back-to-feed link.
- [ ] **Step 3: Manual verification** (DB live): `curl -s localhost:3000/ | grep -c article/` ≥ 1; `/?topic=ai` shows only AI articles; `/article/<real-id>` 200; `/article/<random-uuid>` 404; logged-out (no cookies) works.
- [ ] **Step 4:** `npm test && npm run build` → commit `feat: public feed with topic filter and article detail`.

---

### Task 3: Deploy (folds into pending Phase 2 Task 8)

Vercel project + env vars + cron (user-assisted) → live smoke: public feed renders with real articles, `/admin` gate works, cron ingest fires. Then PLAN.md/JOURNAL.md updates and merge PR #1.
