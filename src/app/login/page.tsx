import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { signInWithGoogle, signInWithPassword } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect('/');
  }

  const { error } = await searchParams;

  return (
    <div
      className="flex min-h-screen items-center justify-center p-10"
      style={{
        background:
          'radial-gradient(1100px 600px at 50% -10%, rgba(139,124,248,.14), transparent 60%), var(--bg)',
      }}
    >
      <div className="flex w-full max-w-[420px] flex-col items-center gap-[26px] text-center">
        <div className="flex items-center gap-[11px]">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[11px] font-display text-xl font-bold text-[#0d1016]"
            style={{ background: 'linear-gradient(140deg, var(--acc), #6ea8fe)' }}
          >
            D
          </div>
          <span className="font-display text-[22px] font-bold tracking-[-.02em]">
            Daily<span className="text-acc">.Product</span>
          </span>
        </div>

        <div>
          <h1 className="mb-3 font-display text-[30px] leading-[1.15] font-bold tracking-[-.02em]">
            Your morning brew of
            <br />
            product knowledge
          </h1>
          <p className="text-[15px] leading-[1.55] text-muted">
            The daily home for product minds — curated content, tools, and
            community, all in one feed.
          </p>
        </div>

        {error && (
          <p className="text-[13px] text-amber">
            Something went wrong signing you in. Please try again.
          </p>
        )}

        <div className="mt-1.5 flex w-full flex-col gap-3">
          <form action={signInWithGoogle} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-[11px] rounded-xl border border-border bg-white p-3.5 text-[15px] font-semibold text-[#1a1a1a] transition-transform duration-100 hover:-translate-y-px"
            >
              <svg width="19" height="19" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h6c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.4-5 3.4-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.1 0 5.7-1 7.6-2.8l-3.7-2.8c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8H1.8v3C3.7 20.5 7.5 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 13.7c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2v-3H1.8C1 7.9.6 9.9.6 12s.4 4.1 1.2 5.7l3.8-3z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 2.3 15.1 1 12 1 7.5 1 3.7 3.5 1.8 7l3.8 3c.9-2.8 3.4-4.8 6.4-4.8z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          {process.env.DEV_LOGIN === '1' && (
            <>
              <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-[.08em] text-faint">
                <span className="h-px flex-1 bg-border" />
                dev sign in
                <span className="h-px flex-1 bg-border" />
              </div>
              <form action={signInWithPassword} className="flex w-full flex-col gap-2.5">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  className="w-full rounded-[10px] border border-border bg-card p-3 text-[13.5px] text-text outline-none placeholder:text-faint"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  required
                  className="w-full rounded-[10px] border border-border bg-card p-3 text-[13.5px] text-text outline-none placeholder:text-faint"
                />
                <button
                  type="submit"
                  className="w-full rounded-[10px] border border-border bg-card p-3 text-[13.5px] font-semibold text-muted transition-colors hover:border-acc hover:text-text"
                >
                  Sign in with email
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-xs leading-[1.5] text-faint">
          By continuing you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}
