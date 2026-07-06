# Daily.Product — Journal

Architecture decisions and session log. Newest entries first.

## 2026-07-06 — Phase 4: auth + onboarding code complete

Four reviewed tasks: identity generator (verbatim from original plan);
Google auth core (designed login screen §1, OAuth server action, session
refresh merged into the Next 16 proxy, callback with onboarding routing,
POST-only signout — security review clean, no open-redirect); designed
onboarding (§2–3: six role cards with monogram tiles, identity block with
reshuffle, topic chips pre-selected by role; placed outside the shell like
/login); auth-aware chrome + gate swap (sidebar user cell, topbar avatar,
admin gate rebuilt as (gated) route-group layout checking dp_admin cookie OR
session is_admin — fail-closed, live-verified; grant-admin script added).
41/41 tests. Remaining: enable Google provider, live sign-in loop,
grant:admin, deploy. Deferred notes in ledger (profile_topics transactionality,
ssr setAll pattern awareness).

## 2026-07-06 — Hifi design pass on the public surface

Jayasuriya delivered a complete design handoff (9 screens, tokens, interactive
prototype) — imported to docs/design/ as the permanent visual source of truth.
Applied to everything built so far in three reviewed tasks: dark-only token
system + Space Grotesk/IBM Plex Sans; 248px sidebar app shell (future nav
Soon-tagged, no faked auth elements); designed feed (cards with hsl-hash
gradient fallbacks, segmented tabs with only New enabled, 296px rail with top
sources + trending tags); designed article reader (TL;DR callout, share
client component, same-topic related grid). Bookmarks/profile/squads/login
screens from the handoff are built in Phases 4-7 against the same spec.
Found day-one RLS gap: sources table was admin-only, nulling public source
names — migration 005 committed (pending apply).

## 2026-07-04 — Data live + Phase 3 public feed built

Migrations applied (user via MCP), 30 sources seeded, first live ingest ran:
467 articles from 26 working feeds (First Round URL fixed; Mind the Product +
a16z paused — RSS discontinued upstream; Cafe Hayek/Of Dollars And Data fail
only from this machine, left active for Vercel). All 467 bulk-approved and
auto-tagged by source category per Jayasuriya's instruction
(scripts/bulk-approve.ts). Admin password set per user request.

Phase 3 built and reviewed the same day: feed query lib (live-DB verified;
caught PostgREST dual-embed silent filter drop, fixed via aliased embeds) and
the public feed UI (topic chips, responsive cards, pagination, article detail
with UUID pre-validation). Review caught doubled headers on admin pages —
fixed with a (public) route group. Also fixed turbopack root __dirname bug
that 404'd every route in dev (bundled config dir != project root; now cwd).

Remaining for launch: Vercel project + env vars + cron (user), live smoke,
merge PR #1. Signup/auth remains Phase 4.

## 2026-07-04 — Phases 1–2 code complete; final review passed; blocked on ops inputs

Subagent-driven execution completed all Phase 1 code tasks (scaffold, Supabase
clients) and all Phase 2 code tasks (canonicalization, feed parsing, ingest
orchestrator, /api/ingest, admin gate, approval queue + sources UI, seed
script). Every component passed built→tested→reviewed→fixed gates; review
rounds caught and fixed real bugs: unstable dedupe keys, HTML-entity excerpt
corruption, relative-link data loss, garbage-link resolution, silent
add-source errors, topic-cap gap, a double-decode crash. Final whole-branch
review (17 commits): merge with fixes → applied in 53e28bc (Next 16 proxy
convention for the admin gate — curl-verified; explicit turbopack root;
branding/metadata; engines >=20). 27/27 tests, clean build.

Process learning: subagent dispatches must carry an explicit "do not spawn
agents" instruction — one fix task spiralled into a delegation loop of agents
spawning agents doing nothing until stood down.

Blocked on Jayasuriya (everything else done): .env.local keys, Supabase MCP
auth (migrations), starter-source list sign-off, Vercel project. Deploy-time
schema confirmations: articles.status default 'pending', sources.status
default 'active'.

## 2026-07-04 — Reorder: core functionality first, signup last

Jayasuriya asked to defer signup/auth and focus on core functionality.
New build order (PLAN.md supersedes spec §10): foundation → ingest+admin →
public read-only feed → auth/onboarding → interactions → streaks → squads →
recommendations. Consequences:
- /admin gets a temporary ADMIN_SECRET gate (env-based) until Google auth
  lands in Phase 4, then swaps to the is_admin RLS role.
- Feed ships with New Trends only; Hot News / Most Read / Liked need
  user interactions and follow auth.
- All four migrations still apply up front — schema is complete from day one.
- Execution: subagent-driven; Task 1 (scaffold) done+reviewed; Task 2
  (Supabase clients) in flight. Supabase project created
  (ref fmalrqiigbhpfmgmlyxo), MCP server added to .mcp.json; awaiting
  user MCP auth + .env.local keys.

## 2026-07-04 — Project inception

**What happened:** Read the full Daily.Product PRD from Jayasuriya's Notion
(via the public page API), brainstormed scope and architecture, wrote and
committed the approved MVP design spec, created master PLAN.md and the
Phase 1 implementation plan.

**Decisions:**
- Goal is a real, launchable MVP (not a demo) targeting the PRD's
  beta → Product Hunt path.
- Stack: Next.js (App Router, TS) + Supabase (Postgres/Auth/RLS) + Vercel
  (hosting + cron). Single app serves public feed, authed app, and /admin
  (Approach A; ingest can migrate to Supabase Edge Functions later if needed).
- Content: RSS ingest with admin approval queue — quality control is the USP.
- AI summaries stubbed at launch (RSS excerpt); LLM swap-in is one function.
- Auth: Google only (Apple deferred — paid dev account, native apps post-MVP).
- MVP includes streaks/activity grid, squads, and basic topic-based
  recommendations; behavioral recs, chat, digest email are post-MVP.
- Process requirement from Jayasuriya: every component is modular and must
  pass five gates — built → tested → reviewed → feedback fixed → deployed.
  Tracked per-component in PLAN.md.
- One implementation plan per phase; each phase ends deployed and testable.

**Blockers:** Need Supabase project keys, Google OAuth client, initial RSS
source list, and Vercel/domain decision from Jayasuriya (tracked in PLAN.md).
