# Daily.Product Phase 6: Streaks + Profile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users get the gamified profile from handoff §8 — streak stats, GitHub-style reading-activity grid, weekly reading chart, profile editing — plus the topbar streak pill and the feed rail streak card (§5).

**Design source:** docs/design/design-handoff.md §8 (Profile), §5 (rail streak card), §4 (topbar streak pill). Data comes from `reads` (user_id, article_id, read_date), `upvotes`, `bookmarks`, `profiles`, `profile_topics`.

## Global Constraints

- Component gate per PLAN.md; conventional commits; `npm test && npm run build` + lint green per task; dev server :3000 untouched; solo implementers/reviewers (no Agent spawning); anon/session client only.
- HONEST DATA ONLY: we do not track reading hours. The handoff's "142h Hours read" stat and "Reading hours" chart are replaced by **Articles read** (count of reads) and a **weekly articles-read bar chart** (12 weeks). Stats row becomes: Day streak (amber) · Articles read (green) · Upvotes given (blue) · Bookmarks (accent). Document as a design deviation.
- Streak definition: consecutive calendar days ending today (or yesterday if none today — a streak isn't broken until a full day is missed) with ≥1 read. Timezone: server UTC dates (read_date is a DATE).
- Activity grid: 17 week-columns × 7 day-rows (Mon-top or Sun-top — pick one, document), cell 12px radius 3, intensity levels 0–4 by reads/day (0, 1, 2, 3, ≥4), colors per handoff: `#1a1f28`, `rgba(139,124,248,.35)`, `.6`, `.82`, `#8b7cf8`. Legend "Less … More".
- Profile editing: display_name, avatar reshuffle (new seed), role, topics — reuses the zod/action patterns from onboarding (same table writes, own-row RLS). No email/auth changes.
- TDD for the pure streak/grid/week-bucket math.

---

### Task 1: Streak + activity math lib (TDD)

**Files:** Create `src/lib/streaks.ts` + `src/lib/streaks.test.ts`.

Pure functions over `readDates: string[]` (YYYY-MM-DD, may contain duplicates) and a `today: string` param (injected for testability):
- `currentStreak(readDates, today)` → number (0 when no reads today AND none yesterday; counting back from today-or-yesterday).
- `activityGrid(readDates, today)` → `{ weeks: { date: string; count: number; level: 0|1|2|3|4 }[][] }` — 17 columns × 7, ending with today's week (grid ends on today; leading cells before the first tracked day still render level 0).
- `weeklyCounts(readDates, today, weeks=12)` → number[] oldest→newest.
- Level mapping: 0→0, 1→1, 2→2, 3→3, ≥4→4.

- [ ] TDD: streak across boundaries (today, yesterday-only, gap breaks, duplicates same day count once for streak), grid shape 17×7 + today included + level mapping, weekly buckets. Implement. Commit `feat: streak and reading-activity math`.

---

### Task 2: Profile page (§8) + editing

**Files:** Create `src/app/(public)/profile/page.tsx` (server, auth-guarded → /login), `src/app/(public)/profile/edit-form.tsx` ('use client'), `src/app/(public)/profile/actions.ts` (updateProfile server action), `src/app/(public)/profile/activity-grid.tsx` + `weekly-chart.tsx` (server components, pure render).

- Page fetches: profile, topics (all + user's), read dates (`reads.read_date` for user, last ~130 days), counts (reads total, upvotes given, bookmarks). Computes via streaks lib.
- Header card (§8): violet-tinted gradient bg, 74px avatar, name font-display 24 700, "{role label} · Joined {profiles.created_at %b %Y}", user topic chips, "Edit profile" button toggling the edit form (client component holding a `useState` open flag wrapping the server-provided defaults; submits `updateProfile` — zod like onboarding: name 2-40, avatarSeed 1-64, role enum, topicIds 1-10; revalidatePath('/profile')).
- Stats row: 4 cards, big font-display 26 700 values in amber/green/blue/accent + labels (streak, articles read, upvotes given, bookmarks).
- Reading activity: `activity-grid.tsx` renders 17×7 (12px cells r3 gap ~3) + "Share streak" button (client, navigator.share/clipboard text "🔥 {n}-day reading streak on Daily.Product") + Less/More legend with the 5 swatches.
- Weekly chart: 12 bars, h-[150px] container, latest bar solid accent, others rgba(139,124,248,.4), W1–W12 labels.
- [ ] Verify: /profile unauthenticated → 307 /login; suite/build green. Commit `feat: designed profile with streaks activity and editing`.

---

### Task 3: Streak chrome (topbar pill + rail card) + Profile nav

**Files:** Modify `src/app/(public)/layout.tsx` (or topbar-user component), `src/app/(public)/rail.tsx`, sidebar nav component.

- Topbar (§4): signed-in with streak ≥1 → amber flame pill (flame SVG + count, gentle 2.4s opacity pulse via a small @keyframes in globals.css — the design's only animation) next to avatar; avatar now links to /profile.
- Rail (§5 card 1): signed-in → streak card ABOVE top-sources: violet→amber gradient tint bg, flame + "{n}-day streak", nudge copy ("Read one article today to keep it going" when today unread), 7-cell mini bar (last 7 days, heights scaled, level colors). Signed-out → card absent (no fake data).
- Sidebar: Profile nav row becomes real Link (active state), user cell also links to /profile (per §4 behavior).
- [ ] Verify structurally signed-out (no pill, no streak card, Profile nav → /login redirect via page guard); suite/build green. Commit `feat: streak pill rail card and profile nav`.

## Post-phase
Signed-in walkthrough by controller/user. PLAN/JOURNAL update. Phase 7 (squads) next.
