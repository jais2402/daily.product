# Daily.Product — Master Plan

Spec: [docs/superpowers/specs/2026-07-04-daily-product-mvp-design.md](docs/superpowers/specs/2026-07-04-daily-product-mvp-design.md)

## Component gate (applies to EVERY component, architecture through UI)

No component is "done" until it has passed all five gates:

1. **Built** — modular, single responsibility, clear interface
2. **Tested** — automated tests written and passing
3. **Reviewed** — code review performed (subagent or human), findings logged
4. **Feedback fixed** — review findings resolved and re-verified
5. **Deployed** — shipped to Vercel and manually verified live

Legend: `[ ]` pending · `[~]` in progress · `[x]` all five gates passed

## Phase 1 — Foundation

Plan: docs/superpowers/plans/2026-07-04-phase-1-foundation.md

- [ ] Next.js scaffold + tooling (TS, Tailwind, Vitest, ESLint)
- [ ] Supabase clients module (browser / server / service-role)
- [ ] Migration 001: profiles, topics, profile_topics, auth trigger, RLS
- [ ] Migration 002: sources, source_suggestions, articles, article_topics, RLS
- [ ] Migration 003: bookmarks, upvotes (+count trigger), reads, RLS
- [ ] Migration 004: squads, squad_members, squad_shares, RLS
- [ ] Identity generator (name + avatar seed) lib
- [ ] Google OAuth sign-in + session middleware
- [ ] Onboarding flow (role → identity → topics)
- [ ] Vercel deploy + live smoke check

## Phase 2 — Ingest + Admin

Plan: docs/superpowers/plans/ (to be written after Phase 1 ships)

- [ ] URL canonicalization + dedupe lib
- [ ] RSS fetch/parse module (per-source isolation, failure tracking)
- [ ] `/api/ingest` cron route (CRON_SECRET)
- [ ] Admin gate (is_admin) + layout
- [ ] Approval queue UI (approve+tag / reject)
- [ ] Sources CRUD + health indicators
- [ ] Source suggestions review
- [ ] Seed initial sources (needs Jayasuriya's list)
- [ ] Vercel cron configured + deployed

## Phase 3 — Feed

- [ ] Feed query builders (New Trends / Hot News / Most Read / Liked)
- [ ] Article card + grid (responsive, placeholder images)
- [ ] Tabs + topic filtering
- [ ] Article detail view + read logging on CTA
- [ ] Bookmarks (toggle + page)
- [ ] Upvotes (toggle + cached count)
- [ ] Deployed

## Phase 4 — Streaks + Profile

- [ ] Streak calculation lib
- [ ] 365-day activity grid component
- [ ] Profile page (edit identity, role, topics)
- [ ] Share-streak
- [ ] Deployed

## Phase 5 — Squads

- [ ] Invite-code lib
- [ ] Create/join squad flows
- [ ] Squad feed + share-to-squad action
- [ ] Deployed

## Phase 6 — Recommendations + Launch polish

- [ ] Recommendations query (topics + recency + upvotes)
- [ ] Sidebar widgets (recent bookmarks, recs)
- [ ] Dark mode QA + accessibility pass
- [ ] Playwright smoke tests (3 critical paths)
- [ ] Production deploy + cron live

## Blocked on Jayasuriya

- [ ] New Supabase project (URL + anon + service keys)
- [ ] Google OAuth client configured in Supabase
- [ ] Starting list of ~10–15 RSS sources
- [ ] Vercel project + domain decision
