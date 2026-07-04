# Daily.Product — Journal

Architecture decisions and session log. Newest entries first.

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
