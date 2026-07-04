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

- [x] Next.js scaffold + tooling (TS, Tailwind, Vitest, ESLint)
- [~] Supabase clients module (browser / server / service-role)
- [ ] Migration 001: profiles, topics, profile_topics, auth trigger, RLS
- [ ] Migration 002: sources, source_suggestions, articles, article_topics, RLS
- [ ] Migration 003: bookmarks, upvotes (+count trigger), reads, RLS
- [ ] Migration 004: squads, squad_members, squad_shares, RLS
- [ ] Vercel deploy skeleton + live smoke check

## Phase 2 — Ingest + Admin (core engine)

- [ ] URL canonicalization + dedupe lib
- [ ] RSS fetch/parse module (per-source isolation, failure tracking)
- [ ] `/api/ingest` cron route (CRON_SECRET)
- [ ] Temporary admin gate via ADMIN_SECRET (swapped for is_admin in Phase 4)
- [ ] Approval queue UI (approve+tag / reject)
- [ ] Sources CRUD + health indicators
- [ ] Seed initial sources (needs Jayasuriya's list)
- [ ] Vercel cron configured + deployed

## Phase 3 — Public feed (core product)

- [ ] Feed query builders (New Trends now; others post-auth)
- [ ] Article card + grid (responsive, placeholder images)
- [ ] Topic filtering (chips)
- [ ] Article detail view + Read More CTA
- [ ] Deployed — at this point the product is publicly usable read-only

## Phase 4 — Auth + onboarding (deferred signup)

- [ ] Identity generator (name + avatar seed) lib
- [ ] Google OAuth sign-in + session middleware
- [ ] Onboarding flow (role → identity → topics)
- [ ] Swap admin gate to is_admin
- [ ] Deployed

## Phase 5 — Interactions + full feed tabs

- [ ] Bookmarks (toggle + page)
- [ ] Upvotes (toggle + cached count)
- [ ] Read logging on CTA
- [ ] Hot News / Most Read / Liked tabs
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
- [ ] Supabase MCP authenticated (`/mcp` in a terminal at ~/Documents/daily-product)
- [ ] `.env.local` keys (URL + anon + service role)
- [ ] Starting list of ~10–15 RSS sources
- [ ] Vercel project + domain decision
- [ ] Google OAuth provider (not needed until Phase 4)
