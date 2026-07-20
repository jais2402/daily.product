'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/**
 * Topbar search box (client component — layout.tsx is a server component,
 * so this must be self-contained). Controlled input seeded from the
 * current URL's ?q (so a reload / shared link shows the active query).
 *
 * Stays in sync with back/forward navigation between searches via the
 * "adjust state during render when a prop changes" pattern (React docs:
 * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
 * rather than a `useEffect` + `setState` — the layout persists across
 * navigations (only `page.tsx` re-renders), so this component isn't
 * remounted when `q` changes, and a synchronous effect-set-state would
 * trip `react-hooks/set-state-in-effect`.
 *
 * Submitting navigates to `/?q=<value>` — deliberately dropping
 * topic/tab/page: a new search is a fresh context (see queries.ts
 * fetchFeedPage SEARCH MODE doc, page.tsx search-mode rendering).
 * Submitting a cleared/empty value navigates back to `/` instead.
 */
export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const [value, setValue] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setValue(q);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-[440px] flex-1">
      <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-faint">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles…"
        aria-label="Search articles"
        className="w-full rounded-[10px] border border-border bg-card py-2.5 pl-[38px] pr-3.5 text-[13.5px] text-text outline-none placeholder:text-faint"
      />
    </form>
  );
}
