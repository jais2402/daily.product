'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { toggleBookmark, toggleUpvote } from './interactions/actions';

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

interface ActionRowState {
  upvoted: boolean;
  upvoteCount: number;
  bookmarked: boolean;
}

interface ActionRowProps {
  articleId: string;
  upvoteCount: number;
  upvoted: boolean;
  bookmarked: boolean;
  signedIn: boolean;
  readMin: number | null;
}

/**
 * Feed-card action row (design-handoff.md §5): read-min, an optimistic
 * upvote button (arrow-up + count, green when active), and a right-aligned
 * optimistic bookmark button (amber + filled when active).
 *
 * Both buttons stopPropagation/preventDefault so they never trigger the
 * card's Link navigation (the card wraps thumbnail/title in their own
 * Links — see feed-card.tsx). Signed-out clicks redirect to /login instead
 * of calling the server action.
 */
export function ActionRow({
  articleId,
  upvoteCount,
  upvoted,
  bookmarked,
  signedIn,
  readMin,
}: ActionRowProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [state, setOptimisticState] = useOptimistic<ActionRowState, Partial<ActionRowState>>(
    { upvoted, upvoteCount, bookmarked },
    (current, update) => ({ ...current, ...update }),
  );

  function handleUpvote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!signedIn) {
      router.push('/login');
      return;
    }

    const nextUpvoted = !state.upvoted;
    const nextCount = state.upvoteCount + (nextUpvoted ? 1 : -1);

    startTransition(async () => {
      setOptimisticState({ upvoted: nextUpvoted, upvoteCount: nextCount });
      const result = await toggleUpvote(articleId);
      if (result.error) {
        setOptimisticState({ upvoted: state.upvoted, upvoteCount: state.upvoteCount });
      }
    });
  }

  function handleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!signedIn) {
      router.push('/login');
      return;
    }

    const nextBookmarked = !state.bookmarked;

    startTransition(async () => {
      setOptimisticState({ bookmarked: nextBookmarked });
      const result = await toggleBookmark(articleId);
      if (result.error) {
        setOptimisticState({ bookmarked: state.bookmarked });
      }
    });
  }

  return (
    <div className="mt-1.5 flex items-center gap-3 text-[12.5px] text-faint">
      {readMin !== null && (
        <span className="flex items-center gap-[5px]">
          <ClockIcon />
          <span>{readMin} min read</span>
        </span>
      )}

      <button
        type="button"
        onClick={handleUpvote}
        className={`flex items-center gap-[5px] ${state.upvoted ? 'text-green' : ''}`}
      >
        <span className={state.upvoted ? 'text-green' : 'text-current'}>
          <ArrowUpIcon />
        </span>
        <span>{state.upvoteCount}</span>
      </button>

      <button
        type="button"
        onClick={handleBookmark}
        className={`ml-auto flex items-center ${state.bookmarked ? 'text-amber' : ''}`}
      >
        <BookmarkIcon filled={state.bookmarked} />
      </button>
    </div>
  );
}
