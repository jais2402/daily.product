import 'server-only';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createServerSupabase } from './server';
import type { MemberRole } from '@/lib/roles';

/**
 * Request-scoped memoization for the handful of Supabase reads that repeat
 * across the signed-in render tree (sidebar + topbar + page.tsx each used to
 * call `auth.getUser()` / fetch the profile / fetch read dates independently
 * — see perf-task-report.md). `cache()` de-dupes by function + args for the
 * lifetime of a single server render, so every consumer below that calls
 * these with no arguments gets the same in-flight/resolved promise instead
 * of issuing its own round trip.
 *
 * Scope: render-path server components only (sidebar.tsx, topbar-user.tsx,
 * page.tsx, profile/page.tsx's getUser+profile). Server actions have their
 * own request lifecycle and are unaffected; the proxy's `getUser()` runs on
 * the middleware runtime, which `cache()` does not span.
 */

export const getServerSupabase = cache(() => createServerSupabase());

export const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface OwnProfile {
  display_name: string;
  avatar_seed: string;
  role: MemberRole | null;
  is_admin: boolean;
  onboarded_at: string | null;
}

/** Null when signed out. */
export const getOwnProfile = cache(async (): Promise<OwnProfile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from('profiles')
    .select('display_name,avatar_seed,role,is_admin,onboarded_at')
    .eq('id', user.id)
    .single();

  return (data as OwnProfile | null) ?? null;
});

/** Most recent 60 read dates (desc), for streak math. `[]` when signed out. */
export const getOwnReadDates = cache(async (): Promise<string[]> => {
  const user = await getSessionUser();
  if (!user) return [];

  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from('reads')
    .select('read_date')
    .eq('user_id', user.id)
    .order('read_date', { ascending: false })
    .limit(60);

  return (data ?? []).map((row) => row.read_date as string);
});
