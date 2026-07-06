# Handoff: Daily.Product — Curated Content Hub for Product Professionals

## Overview
Daily.Product is a "morning brew" content platform for product managers, designers, marketers, and founders — a curated daily feed of product articles, tools, and community, in the spirit of daily.dev but tailored to the product space. This bundle covers the **desktop web** experience end-to-end: onboarding, a feed-first home dashboard, article reading, bookmarks, a gamified profile, and squads (group sharing/community).

## About the Design Files
The file in this bundle (`Daily.Product.dc.html`) is a **design reference created in HTML** — an interactive prototype that demonstrates the intended look, layout, copy, and behavior. It is **not production code to copy directly**. It was authored as a self-contained streaming component and uses a small in-house runtime (`support.js`, not included and not needed).

Your task is to **recreate these designs in the target codebase's environment** using its established patterns and libraries (React/Next, Vue, etc.). If no frontend exists yet, choose the most appropriate stack for the project. All backend, data, auth, and business logic are yours to build — the prototype fakes them with local component state and hardcoded arrays.

To view the prototype: open `Daily.Product.dc.html` in a browser (it renders standalone). Click through the flow — Google/Apple login → role → topics → app.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, and interactions are final and intended to be matched closely. Recreate the UI pixel-accurately using your codebase's component library. The exact tokens are listed under **Design Tokens** below.

---

## Screens / Views

### 1. Onboarding — Login
- **Purpose**: First entry. User authenticates.
- **Layout**: Full-viewport centered column (`max-width: 420px`), radial violet glow at top. Vertical stack, `gap: 26px`, centered text.
- **Components**:
  - Brand lockup: 40×40 rounded-11px gradient tile (`linear-gradient(140deg, --acc, #6ea8fe)`) with "D", next to "Daily.Product" wordmark (`.Product` in accent).
  - Headline: Space Grotesk 30px/1.15 700, "Your morning brew of product knowledge".
  - Sub: IBM Plex Sans 15px/1.55, `--muted`.
  - **Continue with Google** button: white bg, `#1a1a1a` text, 4-color Google G, radius 12, padding 14, full width. Hover: `translateY(-1px)`.
  - **Continue with Apple** button: black bg, white text, Apple glyph, same metrics.
  - Legal line: 12px `--faint`.
- **Behavior**: Both buttons advance to the Role step (real app: trigger OAuth).

### 2. Onboarding — Role Selection (Step 1 of 2)
- **Purpose**: User picks the role that tailors their feed/topics.
- **Layout**: Centered column `max-width: 680px`. Header (eyebrow "STEP 1 OF 2" in accent, title, subtitle), then a **3-column grid** of role cards (`gap: 14px`), then a centered Continue button.
- **Role card**: left-aligned column, padding 18, radius 14. Contains a 38×38 rounded-10 monogram tile (per-role color), role label (Space Grotesk 15 600), and a 12px description. Selected state: border `1.5px --acc` + `rgba(139,124,248,.10)` bg. Unselected: `--border` + `--card`.
- **Roles** (id · label · monogram · color · description):
  - `pm` · Product Manager · PM · `#8b7cf8` · Roadmaps, specs, prioritization
  - `apm` · Associate PM · APM · `#6ea8fe` · Learning the craft
  - `design` · Product Designer · PD · `#34d399` · UX, UI, prototyping
  - `mkt` · Product Marketer · PMM · `#f6a723` · GTM, positioning
  - `founder` · Founder / CPO · F · `#ff7a59` · 0-to-1, product vision
  - `dev` · Developer · DEV · `#e879f9` · Building the product
- **Continue**: accent bg, `#0d1016` text, Space Grotesk 600, radius 11, padding 13/40.

### 3. Onboarding — Topic Selection (Step 2 of 2)
- **Purpose**: Multi-select topics (min 3 recommended) to seed the feed.
- **Layout**: Centered `max-width: 640px`. Header, a full-width search input (magnifier icon, decorative in prototype), a centered wrapping chip cloud (`gap: 10px`), then Back + "Enter Daily.Product" buttons.
- **Chip**: padding 9/16, radius 10, 13.5px 500. Selected: `--acc` bg + `#0d1016` text. Unselected: `--card` bg, `--border`, `--muted` text.
- **Topics** (14): Roadmapping, Discovery, Jobs-to-be-Done, OKRs, Growth, UX Research, Design Systems, Product-Led Growth, Pricing, Analytics, AI & ML, Leadership, Go-to-Market, Prioritization.
- **Behavior**: "Enter Daily.Product" → Home.

### 4. App Shell (wraps screens 5–9)
- **Layout**: Horizontal flex. **Left sidebar 248px** (sticky, full height, `--panel` bg, right border). **Main** = `flex: 1`, own scroll (`height: 100vh; overflow-y: auto`).
- **Sidebar contents (top→bottom)**: brand lockup (32px tile); nav items (Home, Bookmarks, Squads, Profile) each with a 18px line icon; divider; "YOUR TOPICS" label + chip list of selected topics; dashed "+ Add a source" button; and at the bottom (margin-top:auto) a user cell (34px gradient avatar "JV", name, role) → clicking opens Profile.
  - **Nav item**: padding 10/12, radius 10, 14px. Active: `rgba(139,124,248,.12)` bg + `--acc` text + 600 weight. Inactive: transparent + `--muted`. Home stays active while an article is open.
- **Top bar** (sticky inside main): blurred `rgba(13,16,22,.82)` bg, bottom border, padding 14/28. Left: search input (`max-width: 440px`, `--card` bg, magnifier). Right: streak pill (amber flame icon with a gentle 2.4s opacity pulse + "24") and a 34px gradient avatar (→ Profile).

### 5. Home — Feed Dashboard
- **Purpose**: The core daily scan. Browse, upvote, bookmark, open articles.
- **Layout**: Inside main, a row `gap: 26px`, `max-width: 1440px` centered, padding `26px 28px 60px`. Left = feed column (`flex: 1`). Right = **296px rail**.
- **Feed header**: greeting "Good morning, Jaya 👋" (Space Grotesk 23 700) + a segmented **tab switcher** (`--card` bg pill, 4px pad). Tabs: **New / Hot / Most Read / Top**. Active tab = accent bg + `#0d1016`. Each tab actually re-sorts the feed (see State/Behavior).
- **Feed grid**: CSS grid, `gap: 18px`, `grid-template-columns: repeat(N, minmax(0,1fr))` where N is the `feedColumns` tweak (default 3).
- **Article card**: column, `--card` bg, `--border`, radius 16, overflow hidden, cursor pointer. Hover: border → `--acc`, `translateY(-3px)`.
  - **Thumbnail** (toggleable via `showThumbnails`): 150px tall, `linear-gradient(135deg, hsl(h1 62% 46%), hsl(h2 58% 26%))` from per-article hues; a tag chip sits bottom-left (`rgba(13,16,22,.6)` blur, 11px 600 white).
  - **Body** (padding 16, `gap: 9`): source row = 22px rounded-6 source-color glyph tile + source name (`--muted` 12.5px) + relative date (`--faint`, right). Title = Space Grotesk 16.5/1.32 600. Summary = 12.8px/1.5 `--muted`. 
  - **Action row** (12.5px `--faint`): clock + read-min; **upvote** button (arrow-up icon + count, turns `--green` when active); comment icon + count; **bookmark** button (right-aligned, turns `--amber` and fills when saved).
- **Right rail** (3 cards, `gap: 18`):
  1. **Streak card**: violet→amber gradient tint, flame icon + "24-day streak", nudge copy, and a 7-cell mini activity bar (heights 32px, colors by level).
  2. **Top sources for you**: trend icon + title; 4 rows of source glyph + name + follower count + "Follow" button.
  3. **Trending tags**: wrapping "# tag" chips.

### 6. Article Detail
- **Purpose**: Read the summary + body, act, and discover related.
- **Layout**: `max-width: 760px` centered, padding `26px 28px 80px`.
- **Components (top→bottom)**: "← Back to feed" button; source row (glyph + name + dot + "{date} ago"); tag pill (`rgba(139,124,248,.14)` bg, accent text); title (Space Grotesk 32/1.2 700); meta row (clock + "{n} min read", "{reads} reads"); 220px gradient hero (radius 14); **TL;DR** callout (3px accent left border, `--card` bg, uppercase accent label + summary); body paragraphs (16px/1.72, `#cdd6df`).
- **Action bar** (bordered top+bottom): **Upvote** (fills green tint when active), **Save/Saved** (amber tint + fill when saved), **Share** (3-dot share icon), and a right-aligned accent **"Read full article ↗"** CTA (would deep-link to the external source).
- **You might also like**: "You might also like" (Space Grotesk 19 700) + a **3-column** grid of compact related cards (source glyph, title, "{source} · {min}m"). Clicking opens that article.

### 7. Bookmarks
- **Purpose**: Review saved articles.
- **Layout**: `max-width: 1100px`. Title "Saved for later" + "{n} bookmarked · organized by tag & date". A **3-column** grid of saved cards (thumbnail + source + title + read-min + a "Saved" toggle that unsaves).
- **Empty state**: centered bookmark-icon tile, "No bookmarks yet" heading, helper copy, and a "Browse the feed" accent button.

### 8. Profile
- **Purpose**: Identity, gamification, and reading analytics.
- **Layout**: `max-width: 1000px`.
- **Components**:
  - **Header card**: violet-tinted gradient, 74px gradient avatar "JV", name (Space Grotesk 24 700), "{role} · Joined Jan 2025", selected-topic chips, and an "Edit profile" button.
  - **Stats row**: 4-column grid. Each: big Space Grotesk 26 700 value in its own color + label. Values: 24 Day streak (amber), 142h Hours read (accent), 318 Articles read (green), 96 Upvotes given (blue). ("Upvotes given" = 95 + current upvote count.)
  - **Reading activity**: GitHub-style contribution grid — 17 week-columns × 7 day-cells (12px, radius 3), colored by intensity level 0–4. "Share streak" button (share icon). Legend row "Less … More" with the 5 level swatches.
  - **Reading hours · last 12 weeks**: bar chart, 150px tall, 12 bars; latest bar is solid accent, others `rgba(139,124,248,.4)`; W1–W12 labels.
- **Level colors (0→4)**: `#1a1f28`, `rgba(139,124,248,.35)`, `rgba(139,124,248,.6)`, `rgba(139,124,248,.82)`, `#8b7cf8`.

### 9. Squads (Community)
- **Purpose**: Group reading/sharing spaces.
- **List view**: `max-width: 1200px`. Header "Squads" + "+ Create squad" accent button. **3-column** grid of squad cards: 70px gradient banner (per-squad hue), name (Space Grotesk 16 600), description, "{members} members · {active} active now" (active count in green). Hover lift like feed cards.
  - Squads: PM Book Club (128/12), 0→1 Founders (64/8), Design + Product (212/19), Growth Nerds (96/5), APM Circle (340/24), AI for PMs (180/31).
- **Detail view**: "← All squads" button; header (58px gradient avatar, name, "{members} members · {desc}", "Invite" button). Two-column `1fr / 280px`:
  - **Left — "Shared in this squad"**: cards each with a sharer avatar + name + "shared · {when}", and a nested clickable article preview (56px gradient thumb + title + "{source} · {min}m"). Below the list: a message/share composer (input + accent "Send").
  - **Right — Members**: list of 30px gradient avatars + name + online dot (green if online, else grey).

---

## Interactions & Behavior
- **Navigation**: single-page, state-driven. Sidebar nav sets the active screen; clicking a card opens its detail; back buttons return. On every navigation the main scroll container resets to top.
- **Feed tabs re-sort the same data**:
  - New → default/chronological order
  - Hot → by `(votes + comments)` desc
  - Most Read → by `reads` desc
  - Top → by `votes` desc
- **Upvote**: toggles membership in an `upvotes` set; displayed count = base votes + 1 when upvoted; icon/label turns green. `stopPropagation` so it doesn't open the article.
- **Bookmark**: toggles an `bookmarks` set; icon turns amber and fills; feeds the Bookmarks screen and the "Saved/Save" label on article detail. `stopPropagation`.
- **Role/Topic selection**: role is single-select; topics multi-select (toggle).
- **Hover states**: cards lift `translateY(-3px)` + border→accent; buttons lift `-1px`.
- **Animation**: streak flame pulses opacity (`@keyframes`, 2.4s ease-in-out infinite). Card/border transitions ~.16s.
- **Responsive**: prototype targets **desktop web only**. The PRD calls for a responsive 1-column mobile layout — not designed here; implement per your breakpoints (feed grid → 1 col, sidebar → drawer/bottom-nav).

## State Management
Prototype-local state (to be replaced by real data/services):
- `screen`: `onboarding | home | article | bookmarks | profile | squads`
- `onboardStep`: `login | role | topics`
- `role`: selected role id
- `topics`: string[] of selected topics
- `feedTab`: `new | hot | read | liked`
- `articleId`: currently open article
- `squadId`: currently open squad (null = list)
- `bookmarks`: number[] of article ids
- `upvotes`: number[] of article ids

**Backend/logic to build** (from the PRD): OAuth (Google/Apple) + sessions; content aggregation engine (RSS/API ingest, dedupe so one link posts once, storage, image optimization, scheduled refresh); per-user personalized feed + tabs; bookmark/upvote persistence + ranking; short/AI summaries; streak & reading-hours tracking; squads (create/invite/share/membership); recommendations; add-source suggestions; daily digest email. Feed items need: id, title, source, sourceColor/glyph, tag(s), summary, readMin, votes, comments, reads, publishedAt, externalUrl, thumbnail.

## Design Tokens
**Colors**
- `--bg` page `#0d1016`
- `--panel` sidebar/topbar `#12161d`
- `--card` surfaces `#161b22`
- `--card2` nested surfaces `#1a2029`
- `--border` `#232b35`
- `--text` `#e7edf3`
- `--muted` secondary text `#9aa6b2`
- `--faint` tertiary text `#6b7683`
- `--acc` primary accent (violet) `#8b7cf8` (tweakable: `#6ea8fe`, `#34d399`, `#f6a723`, `#ff7a59`)
- `--amber` streaks/bookmarks `#f6a723`
- `--green` upvote/online `#34d399`
- Blue accent `#6ea8fe`; source colors `#f6a723 / #8b7cf8 / #34d399 / #ff7a59 / #6ea8fe / #e879f9 / #cbd5e1 / #f472b6`
- Thumbnails: `linear-gradient(135deg, hsl(h1 62% 46%), hsl(h2 58% 26%))` (per-item hue pair)

**Typography**
- Display/headings/brand/buttons: **Space Grotesk** (400–700)
- Body/UI: **IBM Plex Sans** (400–700)
- Scale seen: 32 (article title), 30 (onboarding H1), 26 (stat value), 23/24 (screen titles), 19 (section), 16.5 (card title), 15 (body/buttons), 13.5–14 (UI), 12–12.8 (meta), 11–11.5 (labels/eyebrows). Letter-spacing `-.02em` on large headings; uppercase eyebrows use `.06–.08em`.

**Radius**: pills/tiles 6–11; cards 14–18; avatars 50%.
**Spacing**: base rhythm of 8; common gaps 6/8/10/14/18/26; card padding 14–18; page padding `26px 28px`.
**Shadow**: minimal; depth comes from borders + hover lift (`translateY(-1px|-3px)`).
**Layout widths**: sidebar 248; right rail 296; home 1440; article 760; bookmarks 1100; profile 1000; squads 1200.

**Configurable (prototype "tweaks")**: `accent` (color), `feedColumns` (2–4, default 3), `showThumbnails` (bool).

## Assets
- **Fonts**: Space Grotesk + IBM Plex Sans via Google Fonts.
- **Icons**: inline SVG, ~stroke-width 2, lucide-style (home, bookmark, users, user, search, plus, arrow-up, message, share, chevron-left, clock, trend, flame). Google "G" and Apple glyphs are inline multi-path SVGs. Swap for your icon library.
- **Images**: none — article/squad thumbnails and avatars are CSS gradients (placeholders). Replace with real source images / OG images / uploaded avatars.
- **Logo**: "Daily.Product" wordmark + a gradient "D" tile (placeholder brand).

## Files
- `Daily.Product.dc.html` — the full interactive prototype (all 9 screens + flow). All layout/copy/tokens live here; use it as the visual source of truth alongside this README.
