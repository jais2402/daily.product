import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  // scope: 'local' — end only this browser's session. The default ('global')
  // revokes every session for the account, which is wrong for a "sign out"
  // button (it would log the user out on other devices/tabs too) and, now
  // that content is members-only, was observed to intermittently 401 the
  // e2e suite's other specs: they share one dev fixture user, so a global
  // sign-out from one parallel test invalidated another test's still-active
  // session mid-run.
  await supabase.auth.signOut({ scope: 'local' });
  return NextResponse.redirect(new URL('/', request.url));
}
