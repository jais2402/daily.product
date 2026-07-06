import { notFound, redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { joinSquad } from '../../actions';

const INVITE_CODE_RE = /^[a-z2-7]{16}$/;

/**
 * `joinSquad` redirects on success and only ever returns `{error}` on
 * failure. Previously this wrapper discarded that error, leaving a failed
 * join with no feedback — now it redirects back to this same page with
 * `?error=1` (preserving the code) so the page below can render an inline
 * error line, same pattern as /admin/login. This wrapper also satisfies
 * Next's `<form action>` typing, which requires `void | Promise<void>`
 * rather than the action's `ActionError | void`.
 */
async function handleJoin(code: string): Promise<void> {
  'use server';
  const result = await joinSquad(code);
  if (result?.error) redirect(`/squads/join/${code}?error=1`);
}

/**
 * Invite-link landing page. Joining only ever happens on POST (the confirm
 * button's form action), never on this page's own GET render — visiting the
 * link is inert; the user must explicitly click "Join squad" to call
 * joinSquad, which redirects into the squad on success.
 */
export default async function JoinSquadPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error } = await searchParams;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!INVITE_CODE_RE.test(code)) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center px-7 py-20 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-7">
        <h1 className="font-display text-[19px] font-bold text-text">
          Join this squad?
        </h1>
        <p className="mt-2 text-[13.5px] text-muted">
          You&apos;ve been invited to join a squad on Daily.Product.
        </p>
        {error && (
          <p className="mt-3 text-[13px] text-red-500">
            Couldn&apos;t join this squad — the invite may be invalid.
          </p>
        )}
        <form action={handleJoin.bind(null, code)} className="mt-5">
          <button
            type="submit"
            className="w-full rounded-[10px] bg-acc px-[18px] py-2.5 font-display text-[13.5px] font-semibold text-[#0d1016]"
          >
            Join squad
          </button>
        </form>
      </div>
    </main>
  );
}
