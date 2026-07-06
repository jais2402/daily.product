'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

function SoonTag() {
  return (
    <span className="ml-auto rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
      Soon
    </span>
  );
}

const NAV_ITEM_BASE =
  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] transition-colors';

const ACTIVE_STYLE = { backgroundColor: 'rgba(139,124,248,.12)' };

/**
 * Sidebar nav rows. Home and Bookmarks are live routes with active styling
 * on exact pathname match (violet tint + text-acc + font-semibold);
 * Squads and Profile remain disabled placeholder rows with a "Soon" tag.
 * Client component (usePathname) so the rest of the sidebar can stay
 * server-rendered.
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <Link
        href="/"
        className={`${NAV_ITEM_BASE} ${
          pathname === '/' ? 'font-semibold text-acc' : 'text-muted hover:bg-card hover:text-text'
        }`}
        style={pathname === '/' ? ACTIVE_STYLE : undefined}
      >
        <HomeIcon />
        <span>Home</span>
      </Link>
      <Link
        href="/bookmarks"
        className={`${NAV_ITEM_BASE} ${
          pathname === '/bookmarks'
            ? 'font-semibold text-acc'
            : 'text-muted hover:bg-card hover:text-text'
        }`}
        style={pathname === '/bookmarks' ? ACTIVE_STYLE : undefined}
      >
        <BookmarkIcon />
        <span>Bookmarks</span>
      </Link>
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
    </>
  );
}
