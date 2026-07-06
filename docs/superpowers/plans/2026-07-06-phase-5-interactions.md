# Daily.Product Phase 5: Interactions + Live Feed Tabs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users can upvote and bookmark articles (optimistic, per the handoff's action-row design), reads are logged when they click through, the feed tabs become functional (New / Hot / Most Read / Top), and the Bookmarks screen (§7) exists with its sidebar nav enabled.

**Architecture:** Server actions (zod + anon client, RLS own-row policies already exist) + small client components for the interactive affordances. Tab ranking logic lives in `src/lib/feed/` with unit tests for the pure parts; Hot/Most Read use two-step aggregate queries (interaction rows → count in JS → fetch articles) — fine at MVP scale.

**Design source:** docs/design/design-handoff.md §5 (card action row), §6 (article action bar), §7 (Bookmarks), Interactions & Behavior section. Tab semantics follow the handoff: New = chronological; Hot = recent-upvote heat (48h window — our data has no comments); Most Read = reads (7d distinct users); Top = all-time `upvote_count` desc. (Supersedes the MVP spec's "Liked" tab — design wins.)

## Global Constraints

- Component gate per PLAN.md. Conventional commits; `npm test && npm run build` + lint green per task. Dev server on :3000 — do NOT kill/restart. Implementers/reviewers work solo (no Agent spawning).
- Schema (already migrated, RLS own-row): `bookmarks(user_id, article_id, created_at)` PK pair; `upvotes(...)` same + DB trigger maintains `articles.upvote_count`; `reads(user_id, article_id, read_date)` PK triple (same-day dedupe built into the PK — upsert with ignoreDuplicates).
- Signed-out: action buttons render but clicking routes to `/login` (design shows them always; honesty rule satisfied since they work post-login). Aggregate tabs (Hot/Most Read/Top) work signed-out.
- Anon/session client ONLY (RLS is the wall). No service client outside admin/scripts.
- Optimistic UI: `useOptimistic`/`useTransition`; `stopPropagation` so buttons never open the card link (design Interactions section).
- Design metrics: upvote = arrow-up icon + count, `--green` when active; bookmark right-aligned, `--amber` + filled when saved; article action bar buttons pick up green/amber tints when active (§6).
- Testing: TDD for pure logic (ranking/window helpers, param parsing extension). Actions/UI verified structurally + against the live DB with the dev user where feasible.
- A signed-in fetch of the user's bookmark/upvote id-sets happens server-side in the page and flows down as props (Sets serialized to arrays).

---

### Task 1: Interaction server actions + tab query extension

**Files:**
- Create: `src/app/(public)/interactions/actions.ts` — `toggleBookmark(articleId)`, `toggleUpvote(articleId)`, `logRead(articleId)` server actions: zod uuid validation; getUser → unauthenticated returns `{error:'auth'}` (client redirects to /login); toggle = try insert, on conflict/exists delete (bookmarks/upvotes); logRead = upsert `{user_id, article_id, read_date: today}` ignoreDuplicates; return `{active: boolean}` for toggles; `revalidatePath('/')` NOT used (optimistic UI owns freshness; avoid full-feed refetch jank) — document this.
- Modify: `src/lib/feed/params.ts` — `parseFeedParams` gains `tab: 'new'|'hot'|'read'|'top'` (default 'new', invalid → 'new'). TDD: extend params tests.
- Modify: `src/lib/feed/queries.ts` — `fetchFeedPage(supabase, {topicSlug, page, tab})`:
  - new: current behavior.
  - top: order `upvote_count` desc, `published_at` desc tiebreak.
  - hot: two-step — `upvotes` where `created_at >= now-48h` → count per article_id in JS → rank ids desc → fetch those articles (respecting topic filter + approved) preserving rank order; fewer than PAGE_SIZE hot articles → backfill with `top` ordering excluding already-ranked ids (document). Pagination over the ranked list.
  - read: same two-step over `reads` where `read_date >= today-7d`, counting DISTINCT user_id per article.
  - Extract the pure count-and-rank helper `rankByCount(rows: {article_id: string, user_id?: string}[], distinctBy?: 'user_id'): string[]` into `src/lib/feed/rank.ts` + TDD (`rank.test.ts`: counts, distinct-user counting, stable ordering by count then insertion).
- [ ] TDD rank + params → implement queries/actions → full suite/build → commit `feat: interaction actions and functional feed tab queries`.

---

### Task 2: Feed + article interaction UI

**Files:**
- Create: `src/app/(public)/action-row.tsx` ('use client'): props {articleId, upvoteCount, upvoted, bookmarked, signedIn, readMin} — renders per §5: clock+min-read (when readMin), upvote button (arrow-up SVG + optimistic count, active text-green), bookmark (right-aligned ml-auto, active text-amber + filled icon). stopPropagation+preventDefault on both; signed-out click → router.push('/login').
- Modify: `src/app/(public)/feed-card.tsx` — embed ActionRow (replaces the static min-read row); card body unchanged otherwise. NOTE: the card is currently wrapped in a single <Link> — nested interactive buttons inside an anchor are invalid/unreliable; restructure: title (and thumbnail) become the links instead of the whole card (keep hover lift on the wrapper via group).
- Modify: `src/app/(public)/page.tsx` — fetch signed-in user's bookmark/upvote sets (two selects) + pass down; tab pill becomes four real `<Link href={?tab=}>` (active per current tab; ALL enabled now); pass tab through parseFeedParams into fetchFeedPage; pagination links preserve tab param.
- Modify: `src/app/(public)/article/[id]/page.tsx` + create `src/app/(public)/article/[id]/article-actions.tsx` ('use client'): action bar gains Upvote (green tint when active) and Save/Saved (amber tint) per §6 alongside Share; the "Read full article ↗" CTA becomes part of this client component so clicking it fires `logRead(articleId)` fire-and-forget BEFORE default navigation proceeds (plain onClick that calls the action without await-blocking nav; keep href/target/rel).
- [ ] Verify live with dev user (sign in via dev form using agent-driven curl is NOT feasible — do structural checks + signed-out behavior; controller/user does the signed-in click-through). Structural: tabs render as links, ?tab=hot|read|top return 200 with plausible ordering, signed-out buttons present. Commit `feat: designed interaction ui with live feed tabs`.

---

### Task 3: Bookmarks page + nav enable

**Files:**
- Create: `src/app/(public)/bookmarks/page.tsx` — server component, auth-guarded (no user → redirect('/login')): fetch user's bookmarks joined to approved articles (embed via bookmarks → articles(...sources(name), article_topics(topics(...)))), newest-bookmark first; header per §7 ("Saved for later" font-display + "{n} bookmarked"); grid of feed cards (REUSE FeedCard with bookmarked=true); empty state per §7 (bookmark icon tile, "No bookmarks yet", helper copy, "Browse the feed" accent Link).
- Modify: `src/app/(public)/sidebar.tsx` — Bookmarks nav row becomes a real Link (active state when pathname is /bookmarks — sidebar is a server component without pathname; EITHER make the nav item active-detection via a tiny client component using usePathname, OR pass nothing and give Home/Bookmarks static styling with active only on exact match via headers()-derived pathname; choose the small client nav-list component (`sidebar-nav.tsx`, 'use client', usePathname) rendering all four nav rows — Squads/Profile still Soon-tagged). 
- [ ] Verify: /bookmarks unauthenticated → 307 /login; signed-out sidebar unchanged visually except Bookmarks now navigates (to login). Full suite/build. Commit `feat: bookmarks screen and live sidebar nav`.

---

## Post-phase
Controller/user: signed-in walkthrough (dev account): upvote → count+green, bookmark → amber + appears in /bookmarks, CTA click → reads row lands, Hot/Most Read/Top reorder. Update PLAN/JOURNAL. Phase 6 (streaks/profile) consumes `reads` next.
