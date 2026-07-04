# Daily.Product — Journal

Architecture decisions and session log. Newest entries first.

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
