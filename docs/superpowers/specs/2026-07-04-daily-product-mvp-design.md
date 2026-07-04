# Daily.Product — MVP Design

**Date:** 2026-07-04
**Status:** Approved by Jayasuriya (brainstorming session)
**Source PRD:** Notion page "Daily.Product" (1bec36a3362e810493fbf8cc35719926)

## 1. Goal

Build a launchable MVP of Daily.Product: a curated daily content hub for product
professionals (PMs, designers, founders, product-minded devs). One place to read
bite-sized, quality-controlled product content every day — "Morning Brew for
product people," inspired by daily.dev.

Success at launch means: a deployed, public product with real curated content
refreshed daily, working accounts, and the habit loop (read → streak → return)
in place — ready for the PRD's beta-cohort → Product Hunt path.

## 2. Decisions made

| Decision | Choice |
|---|---|
| Purpose | Real product, launchable MVP (not a demo) |
| Content pipeline | RSS/API ingest + admin approval queue (quality control is the USP) |
| MVP scope | Core (auth, onboarding, feed, bookmarks, upvotes) + streaks/activity grid + squads + basic recommendations |
| AI summaries | Stubbed at launch: use RSS excerpt as summary. LLM summarization is an isolated function to swap in later. |
| Stack | Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, RLS) + Vercel (hosting + cron) |
| Auth | Google OAuth only at launch (Apple deferred — needs paid dev account; native apps are post-MVP per PRD) |
| Design | Designed in code from the PRD's design requirements; Tailwind CSS + shadcn/ui; light + dark mode |
| Architecture | Single Next.js app (public site + authed app + /admin) — Approach A |
| Repo | New standalone repo at `~/Documents/daily-product` |

## 3. Architecture

```
Vercel Cron (daily) ──▶ /api/ingest ──▶ fetch RSS feeds ──▶ articles (status: pending)
                                                                    │
Admin at /admin ──▶ approve + tag ──▶ articles (status: approved) ──┘
                                                                    ▼
Users ──▶ Google sign-in ──▶ onboarding (role → avatar → topics) ──▶ feed tabs
              │                                                (bookmark / upvote / read)
              └──▶ profile (streaks, activity grid) · squads (share articles)
```

- **One Next.js app** serves three surfaces: public feed (server-rendered,
  readable logged-out — no forced login), the authenticated app, and `/admin`
  (gated by `profiles.is_admin`).
- **Supabase** provides Postgres, Google OAuth, and RLS. Browser uses the anon
  key through RLS; ingest and admin mutations run server-side (service role
  key lives only in server env).
- **Ingest** is a route handler (`POST /api/ingest`) protected by a
  `CRON_SECRET` bearer token, triggered by Vercel Cron daily. It parses each
  active source with `rss-parser`, canonicalizes and dedupes by URL, extracts
  og:image, and inserts `pending` articles with the RSS excerpt as summary.
- **Future migrations kept cheap:** LLM summaries replace one function in the
  ingest pipeline; if ingest outgrows Vercel function limits, it moves to
  Supabase Edge Functions + pg_cron without touching the app.

## 4. Data model

All tables in Supabase Postgres with RLS enabled.

- `profiles` — 1:1 with `auth.users`: `display_name`, `avatar_seed`, `role`
  (enum: pm, apm, designer, marketer, founder, developer, other), `is_admin`
  (default false). Auto-created on first sign-in via trigger.
- `topics` — curated topic catalog (name, slug). Seeded initially; admin-managed.
- `profile_topics` — junction: user's selected topics.
- `sources` — RSS sources: `name`, `site_url`, `feed_url`, `status`
  (active/paused), `last_fetched_at`, `last_error`, `consecutive_failures`.
- `source_suggestions` — user-submitted source ideas: url, note, status
  (pending/accepted/rejected).
- `articles` — `url` (unique, canonicalized), `title`, `summary`, `image_url`,
  `author`, `source_id`, `published_at`, `status` (pending/approved/rejected),
  `approved_at`, `upvote_count` (cached counter).
- `article_topics` — junction: topics assigned at approval time.
- `bookmarks` — (`user_id`, `article_id`, `created_at`), PK on the pair.
- `upvotes` — (`user_id`, `article_id`, `created_at`), PK on the pair; trigger
  maintains `articles.upvote_count`.
- `reads` — (`user_id`, `article_id`, `read_date`); logged when a user opens
  an article detail / clicks through. Powers Most Read, streaks, activity grid.
- `squads` — `name`, `slug`, `invite_code` (unguessable), `created_by`.
- `squad_members` — (`squad_id`, `user_id`, `role` owner/member, `joined_at`).
- `squad_shares` — article shared into a squad by a member, with optional note.

### RLS policy summary

- `profiles`: users read all (display data), update only their own row.
- `articles`, `topics`, `sources` (approved/active content): public read of
  approved articles; only service role / admin writes. Pending and rejected
  articles are invisible to non-admins.
- `bookmarks`, `upvotes`, `reads`, `profile_topics`: owner-only insert/delete/read.
- `squads` / `squad_members` / `squad_shares`: members read; any authed user
  creates a squad; owner manages membership; members insert shares.
- Admin routes additionally verify `is_admin` server-side (RLS is the floor,
  not the only check).

## 5. Feed logic

- **New Trends** (default tab): approved articles, newest `published_at` first.
- **Hot News**: upvote velocity — upvotes received in the last 48h, ties broken
  by recency.
- **Most Read**: distinct readers in the last 7 days.
- **Liked**: the signed-in user's upvoted articles.
- **Topic filtering**: signed-in users' feeds default to their selected topics
  with an "All topics" toggle; logged-out visitors see everything.
- **Recommendations v1** (sidebar "You might also like"): unread approved
  articles matching the user's topics, ranked by recency + upvote count.
  Explicitly the PRD's "basic version"; behavioral ranking is post-MVP.

## 6. Key flows

- **Onboarding** (first login only, 3 screens): role selection → auto-generated
  display name (adjective-noun) + DiceBear avatar from a seed, with reshuffle
  and manual edit → topic selection (pre-selected by role, searchable).
- **Feed**: responsive card grid (3-col desktop, 1-col mobile). Card = image
  (or topic-colored placeholder), source name, title, 2-line summary, topic
  chips, bookmark/upvote/share actions. Card click → detail view: full summary,
  metadata, "Read More" CTA (external link, `target=_blank`) — following the
  CTA logs a `read`.
- **Bookmarks page**: list/grid toggle of saved articles.
- **Profile**: editable avatar/name/role/topics; current streak count;
  GitHub-style 365-day activity grid from `reads`; share-streak button
  (shareable link/image).
- **Squads**: create (name → slug + invite code) → invite via link → squad page
  = feed of shared articles with notes + member list. Share-to-squad action on
  every article card for members. No chat in MVP.
- **Admin**: approval queue (pending articles: approve+tag topics / reject,
  keyboard-friendly), sources CRUD with health indicators (last fetch,
  consecutive failures, auto-paused flags), source-suggestion review.

## 7. Design language

Minimalist, card-first, generous whitespace — per the PRD design section.
Tailwind CSS + shadcn/ui primitives. Light and dark mode (system default +
manual toggle). Manrope/Inter-class type pairing. WCAG 2.1 AA contrast targets.
Subtle micro-interactions on bookmark/upvote (scale/fill animation).

## 8. Error handling

- Ingest isolates each source in try/catch; a failing feed logs `last_error`,
  increments `consecutive_failures`, and never aborts the run. At 5 consecutive
  failures the source auto-pauses and surfaces red in admin.
- Articles with no image render a generated topic-colored placeholder; missing
  excerpts render title-only cards. No blank cards.
- All server mutations validate input with Zod before touching the DB.
- Route handlers return typed JSON errors; the UI shows toast-level failures
  and never swallows errors silently.

## 9. Testing

- **Vitest** (co-located `*.test.ts`) for pure logic: URL canonicalization and
  dedupe, streak calculation, hot-ranking window math, invite-code generation,
  feed query builders.
- **RLS tests** against a test Supabase project: each policy exercised as
  anon / authed non-owner / owner / admin.
- **Playwright smoke tests** (pre-launch): sign-in → onboarding completes;
  feed renders → bookmark persists; admin approves pending article → article
  appears in public feed.
- Every phase must pass `npm run build` + all tests before deploy.

## 10. Build order

Each phase ends deployed to Vercel and manually testable.

1. **Foundation** — Next.js scaffold, Supabase project + full schema + RLS
   migrations, Google OAuth, onboarding flow, profile auto-creation.
2. **Ingest + admin** — cron ingest pipeline, approval queue, sources CRUD,
   seed ~10–15 starting feeds (needs Jayasuriya's source list).
3. **Feed** — tabs, cards, detail view, bookmarks, upvotes, read logging,
   topic filtering.
4. **Streaks + profile** — activity grid, streak computation, profile editing,
   share-streak.
5. **Squads** — create/join/share flows.
6. **Recommendations + polish** — sidebar recs, dark-mode QA, accessibility
   pass, Playwright smokes, production deploy + cron enabled.

## 11. Out of scope for MVP

Native apps, Apple Sign-In, LLM summaries (stub in place), chat inside squads,
behavioral recommendation engine, learning pathways, template flash cards,
daily digest email, browser extension. All tracked in the PRD for post-MVP.

## 12. Open items needed from Jayasuriya

- Supabase project (new) — URL + keys when created.
- Google OAuth client for the new app (Supabase provider setup).
- Starting list of ~10–15 RSS sources (blogs/newsletters to ingest).
- Vercel project + domain decision (e.g., dailyproduct.app vs vercel.app subdomain).
