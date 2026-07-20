'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export interface SidebarTopic {
  id: string;
  name: string;
  slug: string;
}

const CHIP_CLASSNAME =
  'rounded-lg border border-border bg-card px-2.5 py-[5px] text-xs text-muted hover:text-text';

/**
 * Sidebar "Topics" chip list. Client component (useSearchParams) so a chip
 * click preserves the active search `q` — matching the main topic-filter bar
 * in page.tsx's `feedHref` (topic composes with an active search rather than
 * clearing it; only a new search submission or the "Clear" link drops `q`).
 * sidebar.tsx is a server component and can't read searchParams itself, so
 * this is Suspense-wrapped there, same pattern as search-box.tsx.
 */
export function SidebarTopics({ topics }: { topics: SidebarTopic[] }) {
  const searchParams = useSearchParams();
  const q = searchParams.get('q');

  return (
    <>
      {topics.map((topic) => {
        const params = new URLSearchParams();
        params.set('topic', topic.slug);
        if (q) params.set('q', q);
        return (
          <Link key={topic.id} href={`/?${params.toString()}`} className={CHIP_CLASSNAME}>
            {topic.name}
          </Link>
        );
      })}
    </>
  );
}

/** Static fallback shown while SidebarTopics hydrates — same markup, no `q`. */
export function SidebarTopicsFallback({ topics }: { topics: SidebarTopic[] }) {
  return (
    <>
      {topics.map((topic) => (
        <Link key={topic.id} href={`/?topic=${topic.slug}`} className={CHIP_CLASSNAME}>
          {topic.name}
        </Link>
      ))}
    </>
  );
}
