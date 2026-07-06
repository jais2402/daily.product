# Daily.Product — Master Plan

Spec: [docs/superpowers/specs/2026-07-04-daily-product-mvp-design.md](docs/superpowers/specs/2026-07-04-daily-product-mvp-design.md)
(Build order below supersedes the spec's §10 — reordered 2026-07-04 per Jayasuriya: core content functionality first, signup/auth last.)

## Component gate (applies to EVERY component, architecture through UI)

No component is "done" until it has passed all five gates:

1. **Built** — modular, single responsibility, clear interface
2. **Tested** — automated tests written and passing
3. **Reviewed** — code review performed (subagent or human), findings logged
4. **Feedback fixed** — review findings resolved and re-verified
5. **Deployed** — shipped to Vercel and manually verified live

Legend: `[ ]` pending · `[~]` in progress · `[x]` all five gates passed

## Phase 1 — Foundation (no auth UI)

Plan: docs/superpowers/plans/2026-07-04-phase-1-foundation.md (tasks 7–9 deferred to Phase 4)
`[~]` below = gates 1–4 passed (built/tested/reviewed/fixed); deploy gate pending Task 8.

- [~] Next.js scaffold + tooling (TS, Tailwind, Vitest, ESLint)
- [~] Supabase clients module (browser / server / service-role)
- [ ] Migration 001: profiles, topics, profile_topics, auth trigger, RLS (blocked: MCP auth)
- [ ] Migration 002: sources, source_suggestions, articles, article_topics, RLS (blocked: MCP auth)
- [ ] Migration 003: bookmarks, upvotes (+count trigger), reads, RLS (blocked: MCP auth)
- [ ] Migration 004: squads, squad_members, squad_shares, RLS (blocked: MCP auth)
- [ ] Vercel deploy skeleton + live smoke check (blocked: Vercel project)

## Phase 2 — Ingest + Admin (core engine)

Plan: docs/superpowers/plans/2026-07-04-phase-2-ingest-admin.md
Final whole-branch review passed 2026-07-04 (fixes applied in 53e28bc). Branch merge-ready.

- [~] URL canonicalization + dedupe lib
- [~] RSS fetch/parse module (per-source isolation, failure tracking)
- [~] Ingest orchestrator (failure isolation, auto-pause at 5)
- [~] `/api/ingest` cron route (CRON_SECRET)
- [~] Temporary admin gate via ADMIN_SECRET (Next 16 proxy convention; swapped for is_admin in Phase 4)
- [~] Approval queue UI (approve+tag / reject)
- [~] Sources CRUD + health indicators
- [~] Seed script (list awaiting Jayasuriya's confirmation; run blocked on keys)
- [ ] Vercel cron configured + deployed (blocked: user-assisted)
- Deploy-time schema confirmations: articles.status default 'pending'; sources.status default 'active'

## Phase 3 — Public feed (core product)

Plan: docs/superpowers/plans/2026-07-04-phase-3-public-feed.md

- [~] Feed query builders (New Trends now; others post-auth)
- [~] Article card + grid (responsive, placeholder images)
- [~] Topic filtering (chips)
- [~] Article detail view + Read More CTA
- [ ] Deployed — at this point the product is publicly usable read-only (blocked: Vercel project)

## Design pass — hifi handoff applied to public surface (2026-07-06)

Plan: docs/superpowers/plans/2026-07-06-design-pass-public-surface.md · Spec: docs/design/design-handoff.md

- [~] Design tokens + fonts (dark-only, Space Grotesk / IBM Plex Sans)
- [~] App shell (248px sidebar, topbar, Soon-tagged future nav)
- [~] Feed restyle (cards, segmented tabs, 296px rail)
- [~] Article reader restyle (TL;DR, share, related)
- [ ] Migration 005 applied (sources public read) — pending user
- Later phases (4-7) build their screens to this same handoff spec.

## Phase 4 — Auth + onboarding (deferred signup)

Plan: docs/superpowers/plans/2026-07-06-phase-4-auth-onboarding.md

- [~] Identity generator (name + avatar seed) lib
- [~] Google OAuth sign-in + session proxy + designed login (screen §1)
- [~] Onboarding flow — designed role cards + topic chips (screens §2–3)
- [~] Auth-aware chrome (sidebar user cell, topbar) + is_admin gate (legacy cookie fallback)
- [ ] Live OAuth loop verified (needs Google provider enabled in Supabase)
- [ ] grant:admin run for Jayasuriya's account
- [ ] Deployed

## Phase 5 — Interactions + full feed tabs

Plan: docs/superpowers/plans/2026-07-06-phase-5-interactions.md

- [~] Bookmarks (toggle + §7 page + live nav)
- [~] Upvotes (optimistic toggle + cached count)
- [~] Read logging on CTA
- [~] New / Hot / Most Read / Top tabs (design semantics; ranked pagination disjoint across pages)
- [ ] Deployed

## Phase 6 — Streaks + Profile

- [ ] Streak calculation lib
- [ ] 365-day activity grid component
- [ ] Profile page (edit identity, role, topics)
- [ ] Share-streak
- [ ] Deployed

## Phase 7 — Squads

- [ ] Invite-code lib
- [ ] Create/join squad flows
- [ ] Squad feed + share-to-squad action
- [ ] Deployed

## Phase 8 — Recommendations + Launch polish

- [ ] Recommendations query (topics + recency + upvotes)
- [ ] Sidebar widgets (recent bookmarks, recs)
- [ ] Source suggestions review (user-facing "Add Source" needs auth)
- [ ] Dark mode QA + accessibility pass
- [ ] Playwright smoke tests (3 critical paths)
- [ ] Production deploy + cron live

## Blocked on Jayasuriya

- [x] New Supabase project (ref: fmalrqiigbhpfmgmlyxo)
- [x] Supabase MCP authenticated + migrations 001–004 applied (2026-07-04)
- [x] `.env.local` keys (all 5 set + verified)
- [x] Source list confirmed (30 feeds; 2 paused — RSS discontinued upstream)
- [ ] Migration 005 applied (sources public read — 3-line SQL, fixes source names on feed)
- [ ] Vercel project + domain decision (then merge PR #1 and deploy)
- [ ] Google OAuth provider (not needed until Phase 4)
