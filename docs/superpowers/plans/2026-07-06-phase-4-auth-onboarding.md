# Daily.Product Phase 4: Auth + Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users sign in with Google, get a generated identity, pick a role and topics (screens designed in the handoff §1–3), and appear in the app shell's user cell; the admin gate upgrades from the shared secret to `is_admin`.

**Architecture:** Supabase Google OAuth via `@supabase/ssr`; session refresh joins the existing Next 16 `proxy.ts`. Onboarding is one client page + one server action. Public feed stays public — auth only unlocks personal features.

**Design source of truth:** `docs/design/design-handoff.md` §1 (Login), §2 (Role), §3 (Topics), §4 (sidebar user cell) + `docs/design/Daily.Product.dc.html`. Tokens/fonts already in the codebase (design pass).

## Global Constraints

- Component gate: built → tested → reviewed → feedback fixed → deployed (PLAN.md).
- GOOGLE ONLY (project decision) — the handoff shows an Apple button; do NOT render it.
- No streak UI yet (Phase 6): the handoff's topbar streak pill and sidebar streak stay out.
- DB is already migrated: `profiles` (display_name, avatar_seed, role member_role enum: pm/apm/designer/marketer/founder/developer/other, is_admin, onboarded_at; auto-created by trigger on signup), `topics` (13 rows), `profile_topics`. Topic CHIPS COME FROM THE DB CATALOG, not the handoff's illustrative 14.
- Role cards: exactly the handoff's 6 (id→enum value): pm→pm PM `#8b7cf8` "Roadmaps, specs, prioritization" · apm→apm APM `#6ea8fe` "Learning the craft" · design→designer PD `#34d399` "UX, UI, prototyping" · mkt→marketer PMM `#f6a723` "GTM, positioning" · founder→founder F `#ff7a59` "0-to-1, product vision" · dev→developer DEV `#e879f9` "Building the product". (`other` stays a valid enum value, just not a card.)
- Anon key + RLS for all user-scoped writes (own-profile update, own profile_topics) — NO service client in user flows. Admin surfaces may keep the admin client behind the gate.
- `src/lib/feed/**` and ingest code untouched. `npm test && npm run build` green per task; conventional commits; TDD for pure logic.
- Dev server runs on :3000 (hot reload, do not kill). OAuth round-trip needs the Google provider enabled in Supabase (user-side prerequisite) — code tasks proceed regardless; full manual loop happens in Task 4 verification.
- Dispatch note: implementers/reviewers do all work themselves (no Agent spawning).

---

### Task 1: Identity generator lib (TDD)

Exactly the old plan's Task 7 — read `docs/superpowers/plans/2026-07-04-phase-1-foundation.md` **Task 7** and use its test + implementation code VERBATIM: `src/lib/identity.ts` (`generateIdentity(seed?)`, `avatarUrl(seed)` → DiceBear thumbs URL) + `src/lib/identity.test.ts`.

- [ ] Failing tests → RED → implement → GREEN → full suite + build → commit `feat: deterministic identity generator with dicebear avatars`.

---

### Task 2: Auth core (session proxy, login screen, callback, sign-out)

**Files:**
- Modify: `src/proxy.ts` — keep the admin-gate logic; ADD Supabase session refresh for all matched routes and WIDEN the matcher to the app's pages (exclude `_next/*`, static assets, `api/ingest`). Pattern: create a `createServerClient` bound to request/response cookies (see @supabase/ssr docs pattern already used in old plan Task 8 Step 3 — adapt from `docs/superpowers/plans/2026-07-04-phase-1-foundation.md` Task 8's `updateSession`), call `supabase.auth.getUser()` to refresh tokens, and return the response. Admin gate check stays first for `/admin/*`.
- Create: `src/app/(public)/login/page.tsx` (server component + form-action buttons or a tiny client component for the OAuth call — prefer a server action `signInWithGoogle` that calls `supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo: `${origin}/auth/callback`}})` and redirects to the returned URL; origin from headers()).
- Create: `src/app/auth/callback/route.ts` — adapt from old plan Task 8 Step 2 verbatim (exchangeCodeForSession; redirect `/onboarding` when `profiles.onboarded_at` is null, else `/`).
- Create: `src/app/auth/signout/route.ts` — POST: `supabase.auth.signOut()` then redirect `/`.

**Login screen design (§1):** centered column max-w-[420px], min-h-screen, radial violet glow at top (`background: radial-gradient(ellipse at top, rgba(139,124,248,.15), transparent 60%)` on a wrapper), brand lockup (40px gradient "D" tile radius 11 + wordmark), headline "Your morning brew of product knowledge" font-display text-[30px] leading-[1.15] font-bold, sub text-[15px] leading-[1.55] text-muted, **Continue with Google** button (white bg, `#1a1a1a` text, inline 4-color Google G SVG, rounded-[12px], p-3.5, w-full, hover:-translate-y-px), legal line text-[12px] text-faint. NO Apple button.

- [ ] Implement; verification: `/login` renders (200, Google button present, no Apple); `curl -s -o /dev/null -w '%{http_code}' localhost:3000/auth/callback` → 307 to /login (no code param); build+tests green; admin gate still works (307 on /admin without cookie). Commit `feat: google auth core with session proxy and designed login`.

---

### Task 3: Onboarding flow (role → identity → topics)

**Files:**
- Create: `src/lib/roles.ts` + `src/lib/roles.test.ts` — adapt old plan Task 9 Steps 1–2: same `MemberRole` type and `defaultTopicSlugsForRole`, but REPLACE the ROLES array with the 6 design cards (value, label, monogram, color, description — from Global Constraints). Default topic slugs must exist in the live catalog: pm ['product-management','product-strategy','analytics-data'], apm ['product-management','career','user-research'], designer ['product-design','user-research','technology'], marketer ['growth','product-strategy','analytics-data'], founder ['startups-founding','product-strategy','growth'], developer ['technology','ai','startups-founding'], other ['product-management','technology']. Tests: 6 cards; every role (incl. other) ≥2 defaults; pm contains product-management.
- Create: `src/app/(public)/onboarding/page.tsx` (client) + `src/app/(public)/onboarding/actions.ts` (server action) — adapt old plan Task 9 Steps 3–4 (same completeOnboarding zod action, redirect '/' after) but restyle to handoff §2–3:
  - Step ROLE: eyebrow "STEP 1 OF 2" (text-[11.5px] uppercase tracking-[.08em] text-acc font-semibold), title font-display, 3-col grid (sm:grid-cols-2 lg:grid-cols-3) gap-3.5 of role cards: p-[18px] rounded-[14px] border bg-card, 38px rounded-[10px] monogram tile (role color bg, `#0d1016` text, font-bold), label font-display text-[15px] font-semibold, description text-[12px] text-muted; selected: border-acc bg-[rgba(139,124,248,.10)]. Continue button (bg-acc text-[#0d1016] font-display font-semibold rounded-[11px] px-10 py-3, disabled till role picked).
  - Step TOPICS: eyebrow "STEP 2 OF 2", identity block first (avatar img from avatarUrl(seed) 74px rounded-full border, generated name editable input, Reshuffle button) — the handoff has no separate identity screen, fold it compactly above the chips; chip cloud (topics from DB via browser client, chips per spec: px-4 py-[9px] rounded-[10px] text-[13.5px] font-medium, selected bg-acc text-[#0d1016]); role defaults pre-selected; min 1 topic to enable "Enter Daily.Product" (accent button) + Back button (bg-card border).
  - Page guards: if not signed in → redirect('/login'); if already onboarded → redirect('/') (check via browser client getUser + profiles select in a useEffect, or better: make the page a server component wrapper that checks auth server-side and renders the client component — implementer's choice, note it).
- [ ] TDD roles → implement pages → verification (no OAuth yet): `/onboarding` unauthenticated redirects to /login (server-side check makes this curl-testable: 307); build+tests green. Commit `feat: designed onboarding with role cards and topic chips`.

---

### Task 4: Auth-aware chrome + is_admin gate swap

**Files:**
- Modify: `src/app/(public)/sidebar.tsx` — bottom user cell (mt-auto): signed-in → 34px avatar (avatarUrl(avatar_seed)), display_name (text-[13.5px] 600), role label (text-[11.5px] text-muted), plus a small "Sign out" icon-button posting to /auth/signout; signed-out → "Sign in" Link to /login styled as a nav row. (Profile page itself is Phase 6 — the cell is informational, no link yet.)
- Modify: `src/app/(public)/layout.tsx` topbar — right side: signed-in avatar (34px, links nowhere yet) or "Sign in" accent link. NO streak pill.
- Modify: `src/app/admin/layout.tsx` (or a small server check in it) — allow when EITHER the signed-in user's profile has `is_admin` true OR the legacy `dp_admin` cookie is valid (transition fallback; proxy cookie gate stays as outer wall — signed-in admins without the cookie must pass, so move/duplicate the decision: simplest correct = proxy keeps redirecting only when BOTH signals absent → proxy needs the session check too; implementer may instead do the full check in admin layout server-side and simplify proxy to session-refresh + pass-through for /admin, documenting the choice. The gate must FAIL CLOSED either way and `/admin/login` must keep working).
- Create: `scripts/grant-admin.ts` — service-client script: `node --env-file=.env.local node_modules/.bin/tsx scripts/grant-admin.ts <email>` sets `is_admin=true` on the profile whose auth user has that email (join via auth.admin.listUsers or profiles.id lookup through auth admin API). Idempotent, prints result.
- [ ] Verification: signed-out sidebar shows "Sign in"; /admin with legacy cookie still works; build+tests green. FULL MANUAL LOOP (needs Google provider enabled): sign in → onboarding → land on / with user cell showing; grant-admin script run for jayasuriya's email → /admin accessible signed-in without cookie. Record what could/couldn't be verified. Commit `feat: auth-aware chrome and is_admin gate with legacy fallback`.

---

## Post-phase

Update PLAN.md/JOURNAL.md; Vercel env needs no new vars; Supabase Auth redirect URLs need the production URL added at deploy time.
