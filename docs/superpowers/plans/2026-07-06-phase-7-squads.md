# Daily.Product Phase 7: Squads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed-in users create squads, invite via link, share articles into them, and browse a squad's shared feed + member list — handoff §9, with one documented deviation.

**Design source:** docs/design/design-handoff.md §9. **Deviation (honest data):** the prototype's free-text message composer is out — `squad_shares` requires an article; sharing happens via an article-URL composer on the squad page (paste a Daily.Product or original article URL → resolves to an approved article → shares with optional note). No chat.

## Global Constraints

- Component gate per PLAN.md; conventional commits; full `npm test && npm run build` + lint green per task; dev server :3000 untouched; solo agents; TDD for pure logic.
- Schema (migration 004, applied): `squads(id, name, slug unique, invite_code unique, created_by)`; `squad_members(squad_id, user_id, role owner|member)`; `squad_shares(id, squad_id, article_id, shared_by, note)`. RLS: squads select member-only; squads insert `created_by = auth.uid()`; members select member-only, insert SELF only, delete self; shares select/insert member-only (insert also `shared_by = auth.uid()`).
- **RLS choreography for create** (critical): inserting a squad then selecting it back fails until membership exists. Server action must: generate `id = crypto.randomUUID()` in the action, `insert` squad with explicit id (NO `.select()` — default minimal return), then insert owner membership, then redirect to `/squads/${id}`. If membership insert fails, best-effort delete the squad row (it's invisible anyway) and return error.
- **Join flow**: invite code lookup needs to read a squad the user can't yet see → the ONLY sanctioned service-client use in user flows: `joinSquad(code)` resolves code→squad via `createAdminSupabase()` **read-only lookup**, then inserts membership with the USER client (RLS self-insert). Never expose more than {id, name} from the lookup.
- Invite codes: 16-char lowercase base32 (crypto.getRandomValues), pure generator in lib with TDD. Slugs: kebab from name + 4-char suffix, pure + TDD.
- Members list shows profiles (readable by authenticated per RLS) with avatarUrl/initial tiles. No online-dot (no presence system — omit, honest data; design shows it, note deviation).
- Profile/topbar/feed untouched except: article action bar MAY stay untouched this phase (sharing lives on the squad page composer).

---

### Task 1: Squad libs + server actions (TDD)

**Files:**
- Create: `src/lib/squads.ts` + `src/lib/squads.test.ts` — pure: `generateInviteCode()` (16-char [a-z2-7], crypto-random; test shape/charset/uniqueness-ish), `squadSlug(name, suffix?)` (kebab, collapse dashes, 2-40 chars, injectable suffix for tests), `parseArticleRef(input, appOrigin)` → `{articleId} | {url} | null` — accepts `/article/<uuid>` app URLs (any origin match on path), bare UUIDs, or http(s) URLs (returned canonical-ish for DB lookup by url). TDD all three.
- Create: `src/app/(public)/squads/actions.ts` — `createSquad(formData)` (name 2-60; the RLS choreography above; redirect `/squads/${id}`), `joinSquad(code)` (validate shape; service-client lookup; user-client self-insert membership idempotent — on conflict do nothing/ignore duplicate; redirect `/squads/${id}`), `shareToSquad(input)` (zod: squadId uuid, ref string 1-500, note ≤280 optional; resolve ref via parseArticleRef → look up approved article by id or url with the USER client; insert share; return {error?}; revalidatePath(`/squads/${squadId}`)), `leaveSquad(squadId)` (delete own membership; redirect /squads).
- [ ] TDD libs → actions → suite/build/lint → commit `feat: squad libs and membership actions`.

---

### Task 2: Squads UI (§9)

**Files:**
- Create: `src/app/(public)/squads/page.tsx` (server, guard → /login): my squads via membership join; header "Squads" + "+ Create squad" (inline form or small client component: name input + submit → createSquad); 3-col grid of squad cards: 70px gradient banner (hue from squad id hash — same hsl recipe family), name font-display text-[16px] font-semibold, "{members} members" (count via squad_members select count on each — batch with one grouped query client-side count), hover lift. Empty state ("No squads yet — create one").
- Create: `src/app/(public)/squads/[id]/page.tsx` (server, guard; non-member → notFound() — RLS returns nothing, treat as 404): header (58px gradient avatar, name, "{members} members", Invite button → client component copying `${origin}/squads/join/${invite_code}` to clipboard, "Leave" small button → leaveSquad); two-col `1fr / 280px` (stack <lg): LEFT "Shared in this squad" — share cards: sharer avatar+name + "shared · {relative date}", nested article preview (56px thumb/gradient + title + source) linking /article/<id>, note text when present; below: the composer (client): input placeholder "Paste an article link to share…" + optional note input + accent Send → shareToSquad, inline error. RIGHT "Members": rows of 30px avatar/initial + display_name (+ "owner" tag). No online dots (documented deviation).
- Create: `src/app/(public)/squads/join/[code]/page.tsx` (server, guard → /login preserving intent is nice-to-have; simple: guard → /login): calls joinSquad(code) directly in the page (server action logic invoked as function) OR renders a confirm button posting joinSquad — pick the confirm-button form (avoids join-on-GET side effects; document).
- Modify: `src/app/(public)/sidebar-nav.tsx` — Squads becomes live Link (/squads active on prefix match), Add-a-source remains the only Soon.
- [ ] Verify signed-out: /squads + /squads/join/x → 307 /login; nav updated (Soon count 1); suite/build/lint. Commit `feat: designed squads with sharing and invites`.
