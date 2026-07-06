import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { fetchTopicsWithCounts } from '@/lib/feed/queries';
import { avatarUrl } from '@/lib/identity';
import { roleLabel, type MemberRole } from '@/lib/roles';
import { SidebarNav } from './sidebar-nav';

// Lucide-style inline icons (stroke-2, 18px) per design-handoff.md Assets
// section — no icon package dependency, matching the prototype's approach.
// Home/Bookmarks/Squads/Profile icons live in sidebar-nav.tsx alongside the
// nav rows that use them.
function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function LogInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

function SoonTag() {
  return (
    <span className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
      Soon
    </span>
  );
}

const NAV_ITEM_BASE =
  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition-colors';

export async function Sidebar() {
  const supabase = await createServerSupabase();
  const topics = await fetchTopicsWithCounts(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let avatarSeed: string | null = null;
  let role: MemberRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name,avatar_seed,role')
      .eq('id', user.id)
      .single();
    // Profile may exist (auto-created by trigger) but be un-onboarded —
    // fall back to the email prefix and skip the avatar seed entirely.
    displayName = profile?.display_name || user.email?.split('@')[0] || 'You';
    avatarSeed = profile?.avatar_seed || null;
    role = (profile?.role as MemberRole | null) ?? null;
  }

  return (
    <aside className="hidden lg:flex w-[248px] shrink-0 h-screen sticky top-0 flex-col gap-1.5 border-r border-border bg-panel p-3.5">
      {/* Brand lockup */}
      <div className="flex items-center gap-2.5 px-2 pb-3.5 pt-1.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[9px] font-display text-base font-bold text-bg"
          style={{ background: 'linear-gradient(140deg, #8b7cf8, #6ea8fe)' }}
        >
          D
        </div>
        <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-text">
          Daily<span className="text-acc">.Product</span>
        </span>
      </div>

      {/* Nav */}
      <SidebarNav />

      <div className="my-2.5 mx-1 h-px bg-border" />

      <span className="px-2.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[.06em] text-faint">
        Topics
      </span>
      <div className="flex flex-wrap gap-[7px] px-2">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/?topic=${topic.slug}`}
            className="rounded-lg border border-border bg-card px-2.5 py-[5px] text-xs text-muted hover:text-text"
          >
            {topic.name}
          </Link>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="flex cursor-default items-center gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5 text-[13px] font-semibold text-muted"
      >
        <PlusIcon />
        Add a source
        <SoonTag />
      </button>

      {user ? (
        <div className="mt-auto flex items-center gap-2.5 rounded-[10px] px-2 py-2">
          {avatarSeed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl(avatarSeed)}
              alt=""
              className="h-[34px] w-[34px] shrink-0 rounded-full border border-border"
            />
          ) : (
            <div
              className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full font-display text-[13px] font-bold text-bg"
              style={{ background: 'linear-gradient(140deg, #8b7cf8, #6ea8fe)' }}
            >
              {displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13.5px] font-semibold text-text">
              {displayName}
            </span>
            <span className="truncate text-[11.5px] text-muted">
              {roleLabel(role)}
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-muted transition-colors hover:bg-card hover:text-text"
            >
              <LogOutIcon />
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className={`${NAV_ITEM_BASE} mt-auto text-muted hover:bg-card hover:text-text`}
        >
          <LogInIcon />
          <span>Sign in</span>
        </Link>
      )}
    </aside>
  );
}
