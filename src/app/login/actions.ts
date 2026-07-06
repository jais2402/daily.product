'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export async function signInWithGoogle() {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  const origin = `${protocol}://${host}`;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data?.url) {
    redirect('/login?error=auth');
  }

  redirect(data.url);
}

// Dev-only email/password sign-in that bypasses Google OAuth. Hard-gated on
// DEV_LOGIN=1 (server env, never NEXT_PUBLIC) so it cannot function in
// production unless explicitly enabled there.
export async function signInWithPassword(formData: FormData) {
  if (process.env.DEV_LOGIN !== '1') {
    redirect('/login?error=auth');
  }

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) {
    redirect('/login?error=auth');
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    redirect('/login?error=auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', data.user.id)
    .single();

  redirect(profile?.onboarded_at ? '/' : '/onboarding');
}
