import { notFound, redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { joinSquad } from '../../actions';

const INVITE_CODE_RE = /^[a-z2-7]{16}$/;

/**
 * `joinSquad` redirects on success and only ever returns `{error}` on
 * failure — there's no inline error UI on this confirm-button form, so a
 * failed join just leaves the user on the page. This thin wrapper also
 * satisfies Next's `<form action>` typing, which requires
 * `void | Promise<void>` rather than the action's `ActionError | void`.
 */
async function handleJoin(code: string): Promise<void> {
  'use server';
  await joinSquad(code);
}

/**
 * Invite-link landing page. Joining only ever happens on POST (the confirm
 * button's form action), never on this page's own GET render — visiting the
 * link is inert; the user must explicitly click "Join squad" to call
 * joinSquad, which redirects into the squad on success.
 */
export default async function JoinSquadPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

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
