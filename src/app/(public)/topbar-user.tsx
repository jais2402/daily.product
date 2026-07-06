import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { avatarUrl } from '@/lib/identity';

// Right-side topbar chrome: signed-in shows a 34px avatar (no link yet —
// profile page is Phase 6), signed-out shows an accent "Sign in" link.
// Separated from layout.tsx so the topbar's own data fetch is scoped here.
export async function TopbarUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="text-[13.5px] font-semibold text-acc">
        Sign in
      </Link>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_seed,display_name')
    .eq('id', user.id)
    .single();

  const avatarSeed = profile?.avatar_seed || null;
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'You';

  if (!avatarSeed) {
    return (
      <div
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full font-display text-[13px] font-bold text-bg"
        style={{ background: 'linear-gradient(140deg, #8b7cf8, #6ea8fe)' }}
      >
        {displayName[0]?.toUpperCase() ?? '?'}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl(avatarSeed)}
      alt=""
      className="h-[34px] w-[34px] shrink-0 rounded-full border border-border"
    />
  );
}
