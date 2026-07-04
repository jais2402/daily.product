# Daily.Product — Journal

Architecture decisions and session log. Newest entries first.

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
