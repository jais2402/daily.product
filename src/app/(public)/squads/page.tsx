import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { CreateSquadForm } from './create-squad-form';

export const dynamic = 'force-dynamic';

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Small stable string hash so the same id always maps to the same hue. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Banner gradient — same hsl recipe family as feed-card.tsx's thumbnailGradient. */
function bannerGradient(seed: string): string {
  const h1 = hashString(seed) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 62% 46%), hsl(${h2} 58% 26%))`;
}

interface MySquad {
  id: string;
  name: string;
  memberCount: number;
}

interface RawSquadRow {
  squads: { id: string; name: string } | { id: string; name: string }[] | null;
}

/**
 * Fetch the signed-in user's squads (via their own memberships, RLS
 * member-only) plus a per-squad member count. Counts are computed with a
 * single batched `squad_members` select over all my squad ids and tallied
 * in JS — RLS lets a member read the full membership list of any squad
 * they belong to, so this stays a single extra round trip regardless of
 * how many squads the user is in.
 */
async function fetchMySquads(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
): Promise<MySquad[]> {
  const { data, error } = await supabase
    .from('squad_members')
    .select('squads(id,name)')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawSquadRow[];
  const squads = rows
    .map((row) => (Array.isArray(row.squads) ? row.squads[0] : row.squads))
    .filter((squad): squad is { id: string; name: string } => squad != null);

  if (squads.length === 0) return [];

  const squadIds = squads.map((squad) => squad.id);
  const { data: memberRows, error: memberError } = await supabase
    .from('squad_members')
    .select('squad_id')
    .in('squad_id', squadIds);

  if (memberError) throw new Error(memberError.message);

  const counts = new Map<string, number>();
  for (const row of (memberRows ?? []) as { squad_id: string }[]) {
    counts.set(row.squad_id, (counts.get(row.squad_id) ?? 0) + 1);
  }

  return squads.map((squad) => ({
    id: squad.id,
    name: squad.name,
    memberCount: counts.get(squad.id) ?? 0,
  }));
}

export default async function SquadsPage() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const squads = await fetchMySquads(supabase, user.id);

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-7 pb-[60px] pt-[26px]">
      <div className="mb-[22px] flex items-center justify-between">
        <div>
          <h1 className="font-display text-[23px] font-bold tracking-[-0.02em] text-text">
            Squads
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Read, share, and discuss with your people.
          </p>
        </div>
        <CreateSquadForm />
      </div>

      {squads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-card text-muted">
            <UsersIcon />
          </div>
          <h2 className="font-display text-[16.5px] font-semibold text-text">
            No squads yet
          </h2>
          <p className="max-w-[320px] text-[13.5px] text-muted">
            Create a squad to start sharing articles with your people.
          </p>
        </div>
      ) : (
        <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <Link
              key={squad.id}
              href={`/squads/${squad.id}`}
              className="flex flex-col rounded-2xl border border-border bg-card p-[18px] transition-[border-color,transform] duration-150 hover:-translate-y-[3px] hover:border-acc"
            >
              <div
                className="h-[70px] rounded-xl"
                style={{ background: bannerGradient(squad.id) }}
              />
              <h3 className="mt-3.5 font-display text-[16px] font-semibold text-text">
                {squad.name}
              </h3>
              <span className="mt-1 text-[12.5px] text-muted">
                {squad.memberCount} {squad.memberCount === 1 ? 'member' : 'members'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
