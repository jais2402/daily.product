# Daily.Product Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed Next.js + Supabase app where a user signs in with Google, completes the 3-step onboarding (role → generated identity → topics), and lands on a placeholder feed — with the complete database schema and RLS in place for all later phases.

**Architecture:** Single Next.js App Router project. Supabase provides Postgres/Auth/RLS; the browser uses the anon key via `@supabase/ssr` clients, server code can escalate to the service-role key. All tables for the whole MVP ship in this phase as four migrations so later phases only write application code.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest, Zod.

## Global Constraints

- Every component passes five gates: built → tested → reviewed → feedback fixed → deployed (from PLAN.md; user requirement).
- Modular: each file has one responsibility; UI components isolated from data access.
- Budget rule from spec: browser only ever holds the anon key; `SUPABASE_SERVICE_ROLE_KEY` is server-only, never `NEXT_PUBLIC_*`.
- Soft launch quality bar: `npm run build` and `npm test` must pass before every commit that completes a task.
- Public pages must render logged-out (no forced login).
- Path alias `@/*` → `src/*`.
- Commit style: conventional commits (`feat:`, `chore:`, `docs:`, `test:`).

## Prerequisites (user-assisted, do first)

- [ ] **P1:** Jayasuriya creates a new Supabase project (region: closest to India or EU — his call), enables the Google auth provider (Google Cloud OAuth client ID/secret), and provides: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **P2:** Supabase Auth settings → Site URL `http://localhost:3000` for now; add the Vercel URL after Task 10.

---

### Task 1: Scaffold Next.js app + test tooling

**Files:**
- Create: entire app via `create-next-app` in repo root (`/Users/jayasuriyavenkatesan/Documents/daily-product`)
- Create: `vitest.config.ts`, `src/lib/version.ts`, `src/lib/version.test.ts`
- Modify: `package.json` (test scripts)

**Interfaces:**
- Produces: working `npm run dev|build|test` pipeline all later tasks depend on.

- [ ] **Step 1: Scaffold**

```bash
cd /Users/jayasuriyavenkatesan/Documents/daily-product
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

(Repo already has docs/, PLAN.md, JOURNAL.md, .git — create-next-app tolerates non-empty dirs with `.` when files don't conflict; if it refuses, scaffold into `/tmp/dp-scaffold` and `rsync -a` the result in, excluding `.git`.)

- [ ] **Step 2: Install deps**

```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a canary test** — `src/lib/version.ts`:

```ts
export const APP_NAME = 'Daily.Product';
```

`src/lib/version.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { APP_NAME } from './version';

describe('canary', () => {
  it('runs the test pipeline', () => {
    expect(APP_NAME).toBe('Daily.Product');
  });
});
```

- [ ] **Step 6: Verify pipeline**

Run: `npm test && npm run build`
Expected: 1 test passes; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Vitest pipeline"
```

---

### Task 2: Supabase clients module

**Files:**
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/env.ts`, `src/lib/env.test.ts`, `.env.local` (untracked), `.env.example`

**Interfaces:**
- Produces: `createBrowserSupabase()`, `createServerSupabase()` (async, cookie-bound), `createAdminSupabase()` (service role, server-only import). All later data access goes through these three.

- [ ] **Step 1: Failing test for env validation** — `src/lib/env.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { publicEnvSchema } from './env';

describe('publicEnvSchema', () => {
  it('accepts valid public env', () => {
    expect(
      publicEnvSchema.safeParse({
        NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      }).success,
    ).toBe(true);
  });
  it('rejects missing url', () => {
    expect(
      publicEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k' }).success,
    ).toBe(false);
  });
});
```

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/env.ts`**

```ts
import { z } from 'zod';

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function publicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
```

- [ ] **Step 3: Implement the three clients**

`src/lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

export function createBrowserSupabase() {
  const env = publicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
```

`src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — middleware refreshes sessions
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/admin.ts`:

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin env');
  return createClient(url, key, { auth: { persistSession: false } });
}
```

Also: `npm install server-only`.

- [ ] **Step 4: `.env.example` + `.env.local`**

`.env.example` (committed):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`.env.local` gets real values from P1. Confirm `.gitignore` covers `.env*` except `.env.example`.

- [ ] **Step 5: Verify** — `npm test && npm run build` → all pass.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: supabase client modules with validated env"`

---

### Task 3: Migration 001 — identity (profiles, topics, trigger, RLS)

**Files:**
- Create: `supabase/migrations/001_identity.sql`, `supabase/README.md`

**Interfaces:**
- Produces: tables `profiles`, `topics`, `profile_topics`; enum `member_role`; trigger `handle_new_user`. Later tasks rely on column names exactly as written here.

- [ ] **Step 1: Write `supabase/migrations/001_identity.sql`**

```sql
create type member_role as enum
  ('pm','apm','designer','marketer','founder','developer','other');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_seed text not null default '',
  role member_role,
  is_admin boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table profile_topics (
  profile_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (profile_id, topic_id)
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table topics enable row level security;
alter table profile_topics enable row level security;

create policy "profiles readable by authed" on profiles
  for select to authenticated using (true);
create policy "own profile update" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "topics readable by all" on topics
  for select to anon, authenticated using (true);

create policy "own topic links read" on profile_topics
  for select to authenticated using (auth.uid() = profile_id);
create policy "own topic links insert" on profile_topics
  for insert to authenticated with check (auth.uid() = profile_id);
create policy "own topic links delete" on profile_topics
  for delete to authenticated using (auth.uid() = profile_id);

insert into topics (name, slug) values
  ('Product Management','product-management'),
  ('Product Design','product-design'),
  ('Growth','growth'),
  ('Product Strategy','product-strategy'),
  ('User Research','user-research'),
  ('Analytics & Data','analytics-data'),
  ('AI & Tech Trends','ai-tech-trends'),
  ('Leadership','leadership'),
  ('Startups & Founding','startups-founding'),
  ('Career','career');
```

- [ ] **Step 2: Apply** — Supabase Dashboard SQL editor (or `supabase db push` if CLI is linked). Expected: success, no errors.
- [ ] **Step 3: Verify trigger + RLS**

In SQL editor:

```sql
select count(*) from topics;                -- expect 10
select relrowsecurity from pg_class where relname='profiles';  -- expect true
```

- [ ] **Step 4: Commit** — `git add supabase && git commit -m "feat: migration 001 identity tables, auth trigger, RLS"`

---

### Task 4: Migration 002 — content (sources, articles)

**Files:**
- Create: `supabase/migrations/002_content.sql`

**Interfaces:**
- Produces: `sources`, `source_suggestions`, `articles`, `article_topics`; enums `source_status`, `article_status`, `suggestion_status`; helper `is_admin()`.

- [ ] **Step 1: Write `supabase/migrations/002_content.sql`**

```sql
create type source_status as enum ('active','paused');
create type article_status as enum ('pending','approved','rejected');
create type suggestion_status as enum ('pending','accepted','rejected');

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false)
$$;

create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_url text not null,
  feed_url text not null unique,
  status source_status not null default 'active',
  last_fetched_at timestamptz,
  last_error text,
  consecutive_failures int not null default 0,
  created_at timestamptz not null default now()
);

create table source_suggestions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  note text,
  suggested_by uuid references profiles(id) on delete set null,
  status suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  url text not null unique,
  title text not null,
  summary text,
  image_url text,
  author text,
  published_at timestamptz,
  status article_status not null default 'pending',
  approved_at timestamptz,
  upvote_count int not null default 0,
  created_at timestamptz not null default now()
);
create index articles_status_published_idx on articles (status, published_at desc);

create table article_topics (
  article_id uuid not null references articles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (article_id, topic_id)
);

alter table sources enable row level security;
alter table source_suggestions enable row level security;
alter table articles enable row level security;
alter table article_topics enable row level security;

create policy "admin reads sources" on sources
  for select to authenticated using (is_admin());
create policy "admin writes sources" on sources
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "suggest a source" on source_suggestions
  for insert to authenticated with check (auth.uid() = suggested_by);
create policy "own or admin reads suggestions" on source_suggestions
  for select to authenticated using (auth.uid() = suggested_by or is_admin());
create policy "admin updates suggestions" on source_suggestions
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "approved articles public" on articles
  for select to anon, authenticated using (status = 'approved' or is_admin());
create policy "admin writes articles" on articles
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "article topics public" on article_topics
  for select to anon, authenticated using (true);
create policy "admin writes article topics" on article_topics
  for all to authenticated using (is_admin()) with check (is_admin());
```

- [ ] **Step 2: Apply migration.** Expected: success.
- [ ] **Step 3: Verify** — `select is_admin();` in SQL editor runs without error (returns false/null-safe).
- [ ] **Step 4: Commit** — `git commit -am "feat: migration 002 content tables and admin RLS"`

---

### Task 5: Migration 003 — interactions (bookmarks, upvotes, reads)

**Files:**
- Create: `supabase/migrations/003_interactions.sql`

**Interfaces:**
- Produces: `bookmarks`, `upvotes`, `reads`; trigger keeping `articles.upvote_count` accurate.

- [ ] **Step 1: Write `supabase/migrations/003_interactions.sql`**

```sql
create table bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table upvotes (
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table reads (
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  read_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id, read_date)
);
create index reads_user_date_idx on reads (user_id, read_date);

create or replace function bump_upvote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update articles set upvote_count = upvote_count + 1 where id = new.article_id;
    return new;
  elsif tg_op = 'DELETE' then
    update articles set upvote_count = greatest(upvote_count - 1, 0) where id = old.article_id;
    return old;
  end if;
  return null;
end $$;

create trigger on_upvote_change
  after insert or delete on upvotes
  for each row execute function bump_upvote_count();

alter table bookmarks enable row level security;
alter table upvotes enable row level security;
alter table reads enable row level security;

create policy "own bookmarks" on bookmarks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own upvotes" on upvotes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reads" on reads
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply.** Expected: success.
- [ ] **Step 3: Commit** — `git commit -am "feat: migration 003 interactions with upvote counter trigger"`

---

### Task 6: Migration 004 — squads

**Files:**
- Create: `supabase/migrations/004_squads.sql`

**Interfaces:**
- Produces: `squads`, `squad_members`, `squad_shares`; enum `squad_role`; helper `is_squad_member(squad uuid)`.

- [ ] **Step 1: Write `supabase/migrations/004_squads.sql`**

```sql
create type squad_role as enum ('owner','member');

create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  invite_code text not null unique,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table squad_members (
  squad_id uuid not null references squads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role squad_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table squad_shares (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  shared_by uuid not null references profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create or replace function is_squad_member(squad uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from squad_members sm
    where sm.squad_id = squad and sm.user_id = auth.uid()
  )
$$;

alter table squads enable row level security;
alter table squad_members enable row level security;
alter table squad_shares enable row level security;

create policy "members read squads" on squads
  for select to authenticated using (is_squad_member(id));
create policy "create squad" on squads
  for insert to authenticated with check (auth.uid() = created_by);
create policy "owner updates squad" on squads
  for update to authenticated
  using (exists (select 1 from squad_members sm
    where sm.squad_id = id and sm.user_id = auth.uid() and sm.role = 'owner'));

create policy "members read membership" on squad_members
  for select to authenticated using (is_squad_member(squad_id));
create policy "join or add self" on squad_members
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leave squad" on squad_members
  for delete to authenticated using (auth.uid() = user_id);

create policy "members read shares" on squad_shares
  for select to authenticated using (is_squad_member(squad_id));
create policy "members share" on squad_shares
  for insert to authenticated
  with check (auth.uid() = shared_by and is_squad_member(squad_id));
create policy "sharer deletes share" on squad_shares
  for delete to authenticated using (auth.uid() = shared_by);
```

Note: joining via invite code is enforced in a server action (Phase 5) that validates the code with the service client before inserting membership — RLS alone can't see the presented code.

- [ ] **Step 2: Apply.** Expected: success.
- [ ] **Step 3: Commit** — `git commit -am "feat: migration 004 squads with membership RLS"`

---

### Task 7: Identity generator lib (TDD)

**Files:**
- Create: `src/lib/identity.ts`, `src/lib/identity.test.ts`

**Interfaces:**
- Produces: `generateIdentity(seed?: string): { displayName: string; avatarSeed: string }` and `avatarUrl(seed: string): string` (DiceBear HTTP API, no dependency). Onboarding (Task 9) and all avatar rendering use these.

- [ ] **Step 1: Failing tests** — `src/lib/identity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateIdentity, avatarUrl } from './identity';

describe('generateIdentity', () => {
  it('is deterministic for the same seed', () => {
    expect(generateIdentity('abc')).toEqual(generateIdentity('abc'));
  });
  it('produces Adjective Noun format', () => {
    const { displayName } = generateIdentity('abc');
    expect(displayName).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
  it('differs across seeds (usually)', () => {
    expect(generateIdentity('a').displayName).not.toBe(generateIdentity('zz9').displayName);
  });
});

describe('avatarUrl', () => {
  it('builds a DiceBear URL from the seed', () => {
    expect(avatarUrl('abc')).toBe(
      'https://api.dicebear.com/9.x/thumbs/svg?seed=abc',
    );
  });
});
```

Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement `src/lib/identity.ts`**

```ts
const ADJECTIVES = ['Curious','Bold','Quiet','Swift','Bright','Steady','Clever',
  'Honest','Daring','Gentle','Sharp','Patient','Lively','Sunny','Focused',
  'Nimble','Witty','Calm','Eager','Keen'];
const NOUNS = ['Falcon','Otter','Maple','Comet','Harbor','Summit','Lantern',
  'Meadow','Compass','Beacon','Cedar','Drift','Ember','Fjord','Grove',
  'Horizon','Isle','Junction','Kite','Lagoon'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateIdentity(seed?: string): {
  displayName: string;
  avatarSeed: string;
} {
  const s = seed ?? Math.random().toString(36).slice(2, 10);
  const h = hash(s);
  const adjective = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length];
  return { displayName: `${adjective} ${noun}`, avatarSeed: s };
}

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}
```

- [ ] **Step 3: Run** — `npm test` → all pass.
- [ ] **Step 4: Commit** — `git commit -am "feat: deterministic identity generator with DiceBear avatars"`

---

### Task 8: Google auth (login page, callback, session middleware)

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/middleware.ts`, `src/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `createBrowserSupabase`, `createServerSupabase` (Task 2).
- Produces: authenticated sessions; middleware exports `updateSession(request)`; post-login redirect logic (`onboarded_at` null → `/onboarding`, else `/`).

- [ ] **Step 1: Login page** — `src/app/login/page.tsx`:

```tsx
'use client';

import { createBrowserSupabase } from '@/lib/supabase/browser';

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Daily.Product</h1>
      <p className="text-muted-foreground max-w-sm text-center">
        Your daily feed of curated product content.
      </p>
      <button
        onClick={signInWithGoogle}
        className="rounded-lg border px-6 py-3 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        Continue with Google
      </button>
    </main>
  );
}
```

- [ ] **Step 2: OAuth callback** — `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=auth`);

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarded_at')
      .eq('id', user.id)
      .single();
    if (!profile?.onboarded_at) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }
  return NextResponse.redirect(origin);
}
```

- [ ] **Step 3: Session middleware** — `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser(); // refreshes expired tokens
  return response;
}
```

`src/middleware.ts`:

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
```

- [ ] **Step 4: Manual test** — `npm run dev`, visit `/login`, complete Google sign-in. Expected: redirected to `/onboarding` (404 for now — Task 9), and a `profiles` row exists (check Supabase table editor) courtesy of the 001 trigger.
- [ ] **Step 5: Build + commit**

```bash
npm test && npm run build
git add -A && git commit -m "feat: google oauth login, callback, session middleware"
```

---

### Task 9: Onboarding flow (role → identity → topics)

**Files:**
- Create: `src/app/onboarding/page.tsx`, `src/app/onboarding/actions.ts`, `src/lib/roles.ts`, `src/lib/roles.test.ts`

**Interfaces:**
- Consumes: `generateIdentity`/`avatarUrl` (Task 7), `createServerSupabase` (Task 2), tables from 001.
- Produces: `completeOnboarding(input)` server action; `ROLES` and `defaultTopicSlugsForRole(role)` used again on the profile page (Phase 4).

- [ ] **Step 1: Failing test for role→topic defaults** — `src/lib/roles.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ROLES, defaultTopicSlugsForRole } from './roles';

describe('roles', () => {
  it('has 7 roles', () => {
    expect(ROLES).toHaveLength(7);
  });
  it('maps pm to PM-ish topics', () => {
    expect(defaultTopicSlugsForRole('pm')).toContain('product-management');
  });
  it('every role gets at least 2 default topics', () => {
    for (const r of ROLES) {
      expect(defaultTopicSlugsForRole(r.value).length).toBeGreaterThanOrEqual(2);
    }
  });
});
```

Run: `npm test` — Expected: FAIL.

- [ ] **Step 2: Implement `src/lib/roles.ts`**

```ts
export type MemberRole =
  | 'pm' | 'apm' | 'designer' | 'marketer' | 'founder' | 'developer' | 'other';

export const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'pm', label: 'Product Manager' },
  { value: 'apm', label: 'Associate PM' },
  { value: 'designer', label: 'Product Designer' },
  { value: 'marketer', label: 'Product Marketer' },
  { value: 'founder', label: 'Founder' },
  { value: 'developer', label: 'Developer' },
  { value: 'other', label: 'Product Enthusiast' },
];

const DEFAULTS: Record<MemberRole, string[]> = {
  pm: ['product-management', 'product-strategy', 'analytics-data'],
  apm: ['product-management', 'career', 'user-research'],
  designer: ['product-design', 'user-research', 'ai-tech-trends'],
  marketer: ['growth', 'product-strategy', 'analytics-data'],
  founder: ['startups-founding', 'product-strategy', 'growth'],
  developer: ['ai-tech-trends', 'product-management', 'startups-founding'],
  other: ['product-management', 'ai-tech-trends'],
};

export function defaultTopicSlugsForRole(role: MemberRole): string[] {
  return DEFAULTS[role];
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Server action** — `src/app/onboarding/actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

const onboardingSchema = z.object({
  role: z.enum(['pm','apm','designer','marketer','founder','developer','other']),
  displayName: z.string().trim().min(2).max(40),
  avatarSeed: z.string().min(1).max(64),
  topicIds: z.array(z.string().uuid()).min(1).max(10),
});

export async function completeOnboarding(input: unknown) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { role, displayName, avatarSeed, topicIds } = parsed.data;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role,
      display_name: displayName,
      avatar_seed: avatarSeed,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (profileError) return { error: 'Could not save profile' };

  await supabase.from('profile_topics').delete().eq('profile_id', user.id);
  const { error: topicsError } = await supabase
    .from('profile_topics')
    .insert(topicIds.map((topic_id) => ({ profile_id: user.id, topic_id })));
  if (topicsError) return { error: 'Could not save topics' };

  redirect('/');
}
```

- [ ] **Step 4: Onboarding UI** — `src/app/onboarding/page.tsx` (single client page, 3 steps in local state):

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { generateIdentity, avatarUrl } from '@/lib/identity';
import { ROLES, defaultTopicSlugsForRole, type MemberRole } from '@/lib/roles';
import { completeOnboarding } from './actions';

type Topic = { id: string; name: string; slug: string };

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [identity, setIdentity] = useState(generateIdentity());
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createBrowserSupabase()
      .from('topics')
      .select('id,name,slug')
      .order('name')
      .then(({ data }) => setTopics(data ?? []));
  }, []);

  function pickRole(r: MemberRole) {
    setRole(r);
    const defaults = new Set(
      topics.filter((t) => defaultTopicSlugsForRole(r).includes(t.slug)).map((t) => t.id),
    );
    setSelected(defaults);
    setStep(2);
  }

  function toggleTopic(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function finish() {
    if (!role || selected.size === 0) return;
    setSaving(true);
    const result = await completeOnboarding({
      role,
      displayName: nameEdit ?? identity.displayName,
      avatarSeed: identity.avatarSeed,
      topicIds: [...selected],
    });
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 p-8">
      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold">What best describes you?</h1>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => pickRole(r.value)}
                className="rounded-lg border p-4 text-left hover:border-neutral-900 dark:hover:border-neutral-100"
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold">Here&apos;s your identity</h1>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(identity.avatarSeed)}
            alt="Your avatar"
            className="h-24 w-24 rounded-full border"
          />
          <input
            value={nameEdit ?? identity.displayName}
            onChange={(e) => setNameEdit(e.target.value)}
            className="rounded-lg border p-3"
            aria-label="Display name"
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIdentity(generateIdentity());
                setNameEdit(null);
              }}
              className="rounded-lg border px-4 py-2"
            >
              Reshuffle
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-neutral-900"
            >
              Continue
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="text-2xl font-bold">Pick your topics</h1>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  selected.has(t.id)
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : ''
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          {error && <p className="text-red-600">{error}</p>}
          <button
            onClick={finish}
            disabled={saving || selected.size === 0}
            className="rounded-lg bg-neutral-900 px-6 py-3 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {saving ? 'Saving…' : 'Start reading'}
          </button>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Placeholder home** — replace `src/app/page.tsx`:

```tsx
import { createServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-bold">Daily.Product</h1>
      <p className="mt-2 text-neutral-500">
        Feed coming in Phase 3.{' '}
        {user ? `Signed in as ${user.email}` : <Link href="/login" className="underline">Sign in</Link>}
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Manual test** — full loop: sign out (clear cookies), sign in → onboarding → pick role → reshuffle identity → pick topics → land on `/`. Verify in Supabase: `profiles` row updated (`role`, `display_name`, `avatar_seed`, `onboarded_at`), `profile_topics` rows present.
- [ ] **Step 7: Verify + commit**

```bash
npm test && npm run build
git add -A && git commit -m "feat: three-step onboarding with generated identity and topics"
```

---

### Task 10: Deploy to Vercel + live smoke check

**Files:**
- Create: `vercel.json` (only if needed later for cron — not this phase)

**Interfaces:**
- Produces: live URL all later phases deploy onto.

- [ ] **Step 1 (user-assisted):** Create Vercel project from the repo (`vercel` CLI or dashboard import). Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Step 2:** Add the Vercel URL to Supabase Auth → URL configuration (Site URL + `https://<app>.vercel.app/auth/callback` in redirect list). Add it to the Google OAuth client's authorized redirect URIs if using a custom Google client.
- [ ] **Step 3:** Deploy (`git push` if Git-integrated, else `vercel --prod`). Expected: build succeeds.
- [ ] **Step 4: Live smoke check** — on the production URL: home renders logged-out; `/login` → Google → onboarding → `/`; Supabase rows written.
- [ ] **Step 5:** Update PLAN.md Phase 1 checkboxes to `[x]`, append JOURNAL.md entry, commit:

```bash
git add PLAN.md JOURNAL.md && git commit -m "docs: phase 1 shipped"
```

---

## Component gates in this plan

Per the master PLAN.md rule, after **each task**: run its tests (gate 2), request code review of the diff (gate 3 — `/code-review` or subagent reviewer), fix findings (gate 4), and push/deploy (gate 5 — Tasks 1–9 deploy together in Task 10 for this first phase since there's no Vercel project until then; from Phase 2 onward every component deploys as it lands).
