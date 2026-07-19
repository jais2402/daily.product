import Link from 'next/link';
import { getSessionUser, getOwnProfile, getOwnReadDates } from '@/lib/supabase/cached';
import { avatarUrl } from '@/lib/identity';
import { currentStreak } from '@/lib/streaks';

// Flame glyph for the streak pill (design-handoff.md §4 top bar). Local to
// this file — no shared icon module exists yet for it (see rail.tsx / activity
// grid, which each keep their own tiny icon components too).
function FlameIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9.5 10.5 12 8 12 3Z" />
    </svg>
  );
}

// Right-side topbar chrome: signed-in shows a streak pill (when streak >= 1)
// plus a 34px avatar, both linking to /profile; signed-out shows an accent
// "Sign in" link. Separated from layout.tsx so the topbar's own data fetch
// is scoped here.
export async function TopbarUser() {
  // getSessionUser/getOwnProfile/getOwnReadDates are request-scoped (React
  // `cache()`) so this getUser() + profile + read-dates fetch are shared
  // with sidebar.tsx and page.tsx rather than re-querying per component.
  const user = await getSessionUser();

  if (!user) {
    return (
      <Link href="/login" className="text-[13.5px] font-semibold text-acc">
        Sign in
      </Link>
    );
  }

  const [profile, readDates] = await Promise.all([getOwnProfile(), getOwnReadDates()]);

  const avatarSeed = profile?.avatar_seed || null;
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'You';

  const today = new Date().toISOString().slice(0, 10);
  const streak = currentStreak(readDates, today);

  return (
    <div className="flex items-center gap-3">
      {streak >= 1 && (
        <div className="flex items-center gap-[7px] rounded-[10px] border border-border bg-card px-3 py-[7px]">
          <span className="flex text-amber animate-streak-pulse">
            <FlameIcon />
          </span>
          <span className="text-[13px] font-semibold text-text">{streak}</span>
        </div>
      )}
      <Link href="/profile" aria-label="Profile">
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
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </Link>
    </div>
  );
}
