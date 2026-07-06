'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useRef, useTransition } from 'react';
import { toggleBookmark, toggleUpvote, logRead } from '../../interactions/actions';
import { ShareButton } from './share-button';

function ArrowUpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
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

interface ArticleActionsState {
  upvoted: boolean;
  upvoteCount: number;
  bookmarked: boolean;
}

interface ArticleActionsProps {
  articleId: string;
  upvoteCount: number;
  upvoted: boolean;
  bookmarked: boolean;
  signedIn: boolean;
  url: string;
  title: string;
}

/**
 * Article detail action bar (design-handoff.md §6): Upvote (green tint
 * background when active), Save/Saved (amber tint when active), Share, and
 * a right-aligned "Read full article ↗" CTA.
 *
 * The CTA fires `logRead` fire-and-forget on click (no await, no
 * preventDefault) so the external navigation is never blocked by the
 * server action round trip; signed-out clicks still navigate to the
 * article (logRead itself is a no-op server-side for signed-out users).
 */
export function ArticleActions({
  articleId,
  upvoteCount,
  upvoted,
  bookmarked,
  signedIn,
  url,
  title,
}: ArticleActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [state, setOptimisticState] = useOptimistic<
    ArticleActionsState,
    Partial<ArticleActionsState>
  >({ upvoted, upvoteCount, bookmarked }, (current, update) => ({
    ...current,
    ...update,
  }));

  // Last-confirmed server truth, updated on every successful toggle. On
  // error we revert to this ref rather than the pre-click closure snapshot,
  // so a stale closure from a rapid double-click can't stomp a later
  // confirmed state.
  const serverState = useRef<ArticleActionsState>({ upvoted, upvoteCount, bookmarked });

  function handleUpvote() {
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
        setOptimisticState({
          upvoted: serverState.current.upvoted,
          upvoteCount: serverState.current.upvoteCount,
        });
        return;
      }
      const active = result.active ?? nextUpvoted;
      const countDelta = active === serverState.current.upvoted ? 0 : active ? 1 : -1;
      serverState.current = {
        ...serverState.current,
        upvoted: active,
        upvoteCount: serverState.current.upvoteCount + countDelta,
      };
    });
  }

  function handleBookmark() {
    if (!signedIn) {
      router.push('/login');
      return;
    }

    const nextBookmarked = !state.bookmarked;

    startTransition(async () => {
      setOptimisticState({ bookmarked: nextBookmarked });
      const result = await toggleBookmark(articleId);
      if (result.error) {
        setOptimisticState({ bookmarked: serverState.current.bookmarked });
        return;
      }
      serverState.current = {
        ...serverState.current,
        bookmarked: result.active ?? nextBookmarked,
      };
    });
  }

  function handleReadClick() {
    // Fire-and-forget: do not await, do not preventDefault. Signed-out
    // users get {error:'auth'} server-side, which we ignore here.
    void logRead(articleId);
  }

  return (
    <div className="my-6 flex items-center gap-3 border-y border-border py-3">
      <button
        type="button"
        onClick={handleUpvote}
        disabled={isPending}
        className="flex items-center gap-[7px] rounded-[10px] border px-4 py-2 text-[13.5px] font-semibold"
        style={
          state.upvoted
            ? { backgroundColor: 'rgba(52,211,153,.12)', borderColor: 'transparent', color: 'var(--green)' }
            : { borderColor: 'var(--border)', color: 'var(--muted)' }
        }
      >
        <ArrowUpIcon />
        Upvote · {state.upvoteCount}
      </button>

      <button
        type="button"
        onClick={handleBookmark}
        disabled={isPending}
        className="flex items-center gap-[7px] rounded-[10px] border px-4 py-2 text-[13.5px] font-semibold"
        style={
          state.bookmarked
            ? { backgroundColor: 'rgba(246,167,35,.12)', borderColor: 'transparent', color: 'var(--amber)' }
            : { borderColor: 'var(--border)', color: 'var(--muted)' }
        }
      >
        <BookmarkIcon filled={state.bookmarked} />
        {state.bookmarked ? 'Saved' : 'Save'}
      </button>

      <ShareButton title={title} url={url} />

      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={handleReadClick}
        className="ml-auto flex items-center gap-[7px] rounded-[11px] bg-acc px-5 py-2.5 font-display text-[13.5px] font-semibold text-[#0d1016]"
      >
        Read full article ↗
      </a>
    </div>
  );
}
