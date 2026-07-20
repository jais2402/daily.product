import { Suspense } from 'react';
import { Sidebar } from './sidebar';
import { TopbarUser } from './topbar-user';
import { SearchBox } from './search-box';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// Static placeholder shown while SearchBox (which calls useSearchParams,
// requiring a Suspense boundary) hydrates on the client. Same markup as
// the pre-search readOnly input so there's no visible flash/reflow.
function SearchBoxFallback() {
  return (
    <div className="relative max-w-[440px] flex-1">
      <span className="pointer-events-none absolute left-[13px] top-1/2 -translate-y-1/2 text-faint">
        <SearchIcon />
      </span>
      <input
        readOnly
        placeholder="Search articles…"
        className="w-full rounded-[10px] border border-border bg-card py-2.5 pl-[38px] pr-3.5 text-[13.5px] text-text outline-none placeholder:text-faint"
      />
    </div>
  );
}

// Public-surface app shell: sidebar + main column with a sticky topbar.
// Admin pages carry their own header (src/app/admin/layout.tsx) and are
// outside this route group, so they are unaffected.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="h-screen flex-1 overflow-y-auto">
        <div
          className="sticky top-0 z-20 flex items-center gap-4 border-b border-border px-7 py-3.5 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(13,16,22,.82)' }}
        >
          {/* Brand lockup shown on <lg where the sidebar is hidden */}
          <div className="flex items-center gap-2.5 lg:hidden">
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

          <Suspense fallback={<SearchBoxFallback />}>
            <SearchBox />
          </Suspense>

          <div className="ml-auto flex items-center">
            <TopbarUser />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
