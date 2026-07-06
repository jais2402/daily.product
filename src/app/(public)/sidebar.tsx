import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { fetchTopicsWithCounts } from '@/lib/feed/queries';

// Lucide-style inline icons (stroke-2, 18px) per design-handoff.md Assets
// section — no icon package dependency, matching the prototype's approach.
function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
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
      <Link
        href="/"
        className={`${NAV_ITEM_BASE} font-semibold text-acc`}
        style={{ backgroundColor: 'rgba(139,124,248,.12)' }}
      >
        <HomeIcon />
        <span>Home</span>
      </Link>
      <div className={`${NAV_ITEM_BASE} cursor-default text-muted`}>
        <BookmarkIcon />
        <span>Bookmarks</span>
        <SoonTag />
      </div>
      <div className={`${NAV_ITEM_BASE} cursor-default text-muted`}>
        <UsersIcon />
        <span>Squads</span>
        <SoonTag />
      </div>
      <div className={`${NAV_ITEM_BASE} cursor-default text-muted`}>
        <UserIcon />
        <span>Profile</span>
        <SoonTag />
      </div>

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
        className="mt-3 flex cursor-default items-center gap-2 rounded-[10px] border border-dashed border-border px-3 py-2.5 text-[13px] font-semibold text-muted"
      >
        <PlusIcon />
        Add a source
        <SoonTag />
      </button>
    </aside>
  );
}
