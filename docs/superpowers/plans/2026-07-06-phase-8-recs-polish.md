# Daily.Product Phase 8: Recommendations + Launch Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personalized recommendations and recent-bookmarks widgets for signed-in users, error surfacing on join/leave, an accessibility pass, and a Playwright smoke suite covering the three critical paths — the last code phase before launch.

## Global Constraints
- Component gate per PLAN.md; conventional commits; full `npm test && npm run build` + lint green per task; dev server :3000 untouched (Playwright runs against it); solo agents; anon/session client in user flows.
- Recommendations v1 (spec §5 of the MVP design): unread approved articles matching the USER'S TOPICS, ranked recency + upvote_count. Exclude articles the user has read (reads) or bookmarked. Max 4 in the rail card. Signed-out: no recs card (rail keeps sources/tags).
- Recent bookmarks widget: 3 most recent, compact rows, link /article/id, "View all" → /bookmarks.
- Honest data everywhere; no fake counts.

---

### Task 1: Recs + bookmarks widgets, join/leave error surfacing

**Files:**
- Modify `src/lib/feed/queries.ts`: add `fetchRecommendations(supabase, userId, limit=4)` — user topics (profile_topics) → approved articles with `article_topics!inner` in those topic ids, exclude ids in user's reads+bookmarks (two id selects, `.not('id','in',...)` — chunk-safe: cap exclusion lists at ~200 most recent each, document), order published_at desc + upvote_count desc, limit. Pure helper for merge/exclude logic ONLY if nontrivial — otherwise direct query, no test mandated (thin wrapper; verify via live probe).
- Modify `src/app/(public)/rail.tsx` + `src/app/(public)/page.tsx`: signed-in rail gains "You might like" card (above Trending tags, below streak/top-sources): rows = 22px source glyph + title line-clamp-2 text-[13px] + source·date text-faint; empty (no topic matches) → omit card. Plus "Recent bookmarks" card (3 rows same style + "View all" link) — omit when zero.
- Fix silent join/leave errors: `/squads/join/[code]` + squad detail Leave — change the thin wrappers to redirect with `?error=1` on `{error}` returns; both pages render a small error line when present (same pattern as /admin/login).
- [ ] Live probe recs with dev user (has topics from onboarding? if dev user never onboarded, set topics via probe first). Verify structurally signed-out (no recs/bookmarks cards). Suite/build/lint. Commit `feat: recommendations and recent-bookmarks rail with join error surfacing`.

---

### Task 2: Playwright smoke suite + accessibility pass

**Files:**
- Add Playwright: `npm i -D @playwright/test` + `npx playwright install chromium`; `playwright.config.ts` (baseURL http://localhost:3000, reuse existing server — do NOT let Playwright start its own when one runs: use `webServer: { command: 'npm run dev', url, reuseExistingServer: true }`); script `"test:e2e": "playwright test"`. Tests in `e2e/smoke.spec.ts`:
  1. Public feed: `/` shows ≥1 article card, topic chip filters (click AI chip → URL has topic=ai, cards render), article detail opens with TL;DR or title + Read CTA.
  2. Auth loop (dev login, DEV_LOGIN=1 + dev@dailyproduct.local/DevPass!2402): sign in via the dev form → lands on / (or /onboarding — handle both: if onboarding, complete it minimally: pick PM role, keep defaults, enter) → sidebar shows user cell; visit /bookmarks (200); sign out.
  3. Admin gate: /admin unauthenticated redirects to /admin/login; with ADMIN_SECRET (read from env in the test via process.env — playwright config loads .env.local via dotenv-style manual parse or direct file read) → queue page renders.
  - Keep tests resilient (data-independent assertions; no exact counts).
- Accessibility pass (quick, code-level): icon-only buttons get aria-label (sign-out, share, upvote, bookmark, reshuffle, invite); images meaningful alt or alt=""; form inputs get aria-label/placeholder pairing; focus-visible ring utility on interactive elements missing it (globals.css: `:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }` — verify it doesn't clash). Contrast: text-faint (#6b7683) on bg (#0d1016) ≈ 4.6:1 — acceptable; note any spots below AA you find, fix cheap ones.
- [ ] `npm run test:e2e` green against the running dev server (all 3 specs); unit suite/build/lint green. Commit `test: playwright smoke suite and accessibility pass`.

## Post-phase
Final whole-branch review (max model) over Phases 5-8 → fixes → docs (PLAN/JOURNAL) → push. Deploy remains user-assisted (Vercel + env + cron + merge PR #1).
