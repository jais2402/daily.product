import 'server-only';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Shared authorization decision for everything under /admin/* — both page
 * rendering (the (gated) layout) and server actions invoked directly via
 * POST, which bypass the layout's render-time check entirely.
 *
 * Kept separate from gate.ts (which stays a pure, dependency-free module)
 * because gate.test.ts imports gate.ts directly as a unit test; pulling in
 * next/headers + the Supabase server client here would drag Next.js
 * server-only runtime concerns into that pure test's import graph.
 *
 * Fail-closed order:
 *   1. Valid legacy `dp_admin` cookie → allow (transition fallback).
 *   2. Signed-in user whose own profile has `is_admin = true` → allow.
 *   3. Otherwise → deny.
 */
export async function assertAdminAccess(): Promise<boolean> {
  const cookieStore = await cookies();
  const key = cookieStore.get(ADMIN_COOKIE)?.value;
  if (isValidAdminKey(key, process.env.ADMIN_SECRET)) return true;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (profile?.is_admin) return true;
  }

  return false;
}
