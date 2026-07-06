# Daily.Product Design Pass: Public Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The existing public surface (app shell, feed, article detail) matches Jayasuriya's high-fidelity design handoff pixel-closely: dark `#0d1016` theme, violet `#8b7cf8` accent, Space Grotesk + IBM Plex Sans, 248px sidebar shell, designed feed cards and article reader.

**Architecture:** Design tokens become CSS custom properties consumed through Tailwind arbitrary values / theme vars. Fonts via `next/font/google`. The shell is a server-component layout inside the `(public)` route group. No new client JS except what interactivity strictly needs (none this pass — tabs beyond "New", upvotes, bookmarks, streaks are later phases).

**Design source of truth (read both):**
- `docs/design/design-handoff.md` — screens, tokens, metrics (authoritative for values)
- `docs/design/Daily.Product.dc.html` — interactive prototype (authoritative for look; grep it for exact CSS when the doc is ambiguous)

## Global Constraints

- Component gate: built → tested → reviewed → feedback fixed → deployed (PLAN.md).
- Tokens verbatim from the handoff: bg `#0d1016`, panel `#12161d`, card `#161b22`, card2 `#1a2029`, border `#232b35`, text `#e7edf3`, muted `#9aa6b2`, faint `#6b7683`, accent `#8b7cf8`, amber `#f6a723`, green `#34d399`, blue `#6ea8fe`. Fonts: Space Grotesk (display/headings/buttons), IBM Plex Sans (body/UI). Radii: pills/tiles 6–11, cards 14–18. Sidebar 248px, right rail 296px, home max 1440px, article max 760px.
- **Dark theme becomes the ONLY theme this pass** (the design is dark-first; drop the light/dark media split — set the palette unconditionally).
- AUTH-DEPENDENT design elements are OUT OF SCOPE and must not be faked: streak pill/card, user avatar cell, bookmarks/profile/squads nav destinations, upvote/comment/bookmark actions, personalized greeting name, personalized "your topics". Where the design shows them: sidebar nav renders Bookmarks/Squads/Profile as disabled rows with a subtle "Soon" tag; topbar shows search only; feed greeting is "Good morning 👋" (no name); card action row shows read-length + source only; article action bar shows only the "Read full article ↗" CTA and Share (native share/copy link is allowed — it needs one tiny client component, acceptable).
- Feed tab switcher: render the pill with New / Hot / Most Read / Top, but only **New** enabled (active); the other three are disabled with `title="Coming with accounts"` — they need interaction data (Phase 5).
- Real article images stay (design's gradient thumbnails are placeholders — README says replace with real images); keep the existing topic-hash gradient ONLY as the no-image fallback, restyled to the design's `linear-gradient(135deg, hsl(h 62% 46%), hsl(h2 58% 26%))` recipe with a bottom-left tag chip.
- Public pages stay server components, anon client only, `force-dynamic`; existing routes and query lib unchanged (this is a presentation pass — `src/lib/**` must not change).
- Admin pages are NOT restyled this pass (they inherit the new fonts/base palette from globals, which is fine — verify they remain usable, single header, no layout breakage).
- `npm test && npm run build` green before each completing commit; conventional commits. The dev server on :3000 hot-reloads — use it (curl + inspection) but do NOT kill/restart it.
- Dispatch note: implementers/reviewers do all work themselves (no Agent spawning).

---

### Task 1: Design foundation + app shell

**Files:**
- Modify: `src/app/layout.tsx` (fonts swap → Space Grotesk + IBM Plex Sans variables), `src/app/globals.css` (token custom properties, dark-only base, body defaults)
- Create: `src/app/(public)/sidebar.tsx` (server component), rewrite `src/app/(public)/layout.tsx` (shell: sidebar + main column with sticky topbar)

**Shell spec (from handoff §4):** flex row; sidebar 248px sticky full-height `--panel` bg right-border; contents top→bottom: brand lockup (32px gradient "D" tile + wordmark with ".Product" in accent), nav (Home active-style; Bookmarks/Squads/Profile disabled + "Soon"), divider, "TOPICS" label + chip list (from `fetchTopicsWithCounts`, each chip links `/?topic=slug`), dashed "+ Add a source" (disabled, "Soon"). Main: `flex:1`, own scroll; sticky topbar (blurred `rgba(13,16,22,.82)`, bottom border, padding 14/28) containing the search input shell (`max-width:440px`, `--card` bg, magnifier icon; decorative this pass — no handler, `readOnly` with placeholder "Search articles…").
- Nav item: padding 10/12 radius 10 14px; active `rgba(139,124,248,.12)` bg + accent text + 600.
- Mobile (<lg): sidebar hidden (design targets desktop; simple `hidden lg:flex` is acceptable this pass), topbar shows brand lockup left instead.

- [ ] Implement fonts + tokens + shell per spec. Admin visual sanity: `/admin/login` still renders single header, usable (inherits fonts only).
- [ ] Verify on the running server: `curl -s localhost:3000/ | grep -c 'Soon'` ≥ 3; sidebar chips present; page bg is `#0d1016` (inspect emitted CSS).
- [ ] `npm test && npm run build` → commit `feat: design tokens, fonts, and sidebar app shell`.

---

### Task 2: Feed restyle (home)

**Files:**
- Modify: `src/app/(public)/page.tsx`, `src/app/(public)/feed-card.tsx`

**Spec (handoff §5):** inside main: row `max-width:1440px` centered, padding `26px 28px 60px`, gap 26. Left = feed. Right = 296px rail (hidden <xl).
- Feed header: "Good morning 👋" Space Grotesk 23 700 + segmented tab pill (`--card` bg, 4px pad): New (active: accent bg + `#0d1016` text) / Hot / Most Read / Top (disabled, title tooltip).
- Grid: 3 cols (lg), 2 (md), 1 (sm), gap 18.
- Card: `--card` bg, `--border`, radius 16, hover border-accent + translateY(-3px), pointer; thumbnail 150px (real image cover, else the hsl-gradient fallback) with bottom-left tag chip (first topic, `rgba(13,16,22,.6)` backdrop-blur 11px 600 white); body padding 16 gap 9: source row (22px rounded-6 colored glyph tile with source initial + source name muted 12.5 + relative date right faint), title Space Grotesk 16.5/1.32 600 (2-line clamp), summary 12.8/1.5 muted (3-line clamp), action row faint 12.5 (clock icon + "{n} min read" estimated as `max(1, round(words/220))` from summary length — keep honest: if summary missing, omit). Whole card links to `/article/<id>`.
- Topic chip row (existing chips) restyles to spec chip metrics (padding 9/16 radius 10, selected accent bg `#0d1016` text).
- Right rail: (1) "Top sources" card — top 4 sources by article count (one grouped query via anon client is fine to ADD in page.tsx — inline, not in lib), glyph + name + "{n} articles"; (2) "Trending tags" card — topic chips. NO streak card (auth).
- Pagination + empty state keep working, restyled to match.

- [ ] Implement; verify live: `/`, `/?topic=ai`, `/?page=2` all render; card count 24; tag chips filter.
- [ ] `npm test && npm run build` → commit `feat: designed feed with rail and segmented tabs`.

---

### Task 3: Article detail restyle + related

**Files:**
- Modify: `src/app/(public)/article/[id]/page.tsx`
- Create: `src/app/(public)/article/[id]/share-button.tsx` (tiny client component: native `navigator.share` fallback copy-to-clipboard, "Share")

**Spec (handoff §6):** `max-width:760px` centered padding `26px 28px 80px`; "← Back to feed"; source row (glyph + name + dot + relative date); tag pill (`rgba(139,124,248,.14)` bg accent text); title Space Grotesk 32/1.2 700; meta row (clock + "{n} min read"); 220px hero (real image cover else gradient, radius 14); **TL;DR callout** (3px accent left border, `--card` bg, uppercase accent "TL;DR" label + summary text 16/1.72 `#cdd6df`); action bar (top+bottom borders): Share button + right-aligned accent "Read full article ↗" (`target=_blank rel=noreferrer`); **"You might also like"**: Space Grotesk 19 700 + 3-col grid of up to 3 same-first-topic approved articles (exclude self, newest first; query inline via anon client): compact card = source glyph + 2-line title + "{source} · {date}". Clicking opens that article.

- [ ] Implement; verify live: real article renders all sections; related cards link correctly; share button present; 404 paths still work.
- [ ] `npm test && npm run build` → commit `feat: designed article reader with tldr and related`.
