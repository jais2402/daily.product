import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { avatarUrl } from '@/lib/identity';
import { InviteButton } from './invite-button';
import { ShareComposer } from './share-composer';
import { leaveSquad } from '../actions';

export const dynamic = 'force-dynamic';

/**
 * `leaveSquad` redirects on success and only ever returns `{error}` on
 * failure (e.g. a stray DB error). Previously this wrapper discarded that
 * error, leaving a failed leave with no feedback — now it redirects back to
 * this same squad page with `?error=1` so the page below can render an
 * inline error line, same pattern as /admin/login. This wrapper also
 * satisfies Next's `<form action>` typing, which requires
 * `void | Promise<void>` rather than the action's `ActionError | void`.
 */
async function handleLeave(squadId: string): Promise<void> {
  'use server';
  const result = await leaveSquad(squadId);
  if (result?.error) redirect(`/squads/${squadId}?error=1`);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Small stable string hash so the same id always maps to the same hue. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function bannerGradient(seed: string): string {
  const h1 = hashString(seed) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 62% 46%), hsl(${h2} 58% 26%))`;
}

function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface SquadRow {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
}

interface MemberRow {
  user_id: string;
  role: 'owner' | 'member';
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_seed: string | null;
}

interface ArticleRow {
  id: string;
  title: string;
  image_url: string | null;
  sources: { name: string } | { name: string }[] | null;
}

interface RawShareRow {
  id: string;
  note: string | null;
  created_at: string;
  shared_by: string;
  articles: ArticleRow | ArticleRow[] | null;
}

interface ShareItem {
  id: string;
  note: string | null;
  when: string;
  sharerName: string;
  sharerSeed: string;
  articleId: string;
  articleTitle: string;
  articleImage: string | null;
  sourceName: string | null;
}

/** RLS is member-only select; a non-member (or bogus id) reads back null. */
async function fetchSquad(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  id: string,
): Promise<SquadRow | null> {
  const { data, error } = await supabase
    .from('squads')
    .select('id,name,invite_code,created_by')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function fetchMembers(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  squadId: string,
): Promise<{ members: MemberRow[]; profiles: Map<string, ProfileRow> }> {
  const { data: memberRows, error } = await supabase
    .from('squad_members')
    .select('user_id,role')
    .eq('squad_id', squadId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  const members = (memberRows ?? []) as MemberRow[];
  if (members.length === 0) return { members: [], profiles: new Map() };

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id,display_name,avatar_seed')
    .in(
      'id',
      members.map((member) => member.user_id),
    );

  if (profileError) throw new Error(profileError.message);

  const profiles = new Map<string, ProfileRow>();
  for (const profile of (profileRows ?? []) as ProfileRow[]) {
    profiles.set(profile.id, profile);
  }

  return { members, profiles };
}

async function fetchShares(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  squadId: string,
  profiles: Map<string, ProfileRow>,
): Promise<ShareItem[]> {
  const { data, error } = await supabase
    .from('squad_shares')
    .select(
      'id,note,created_at,shared_by,articles(id,title,image_url,sources(name))',
    )
    .eq('squad_id', squadId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawShareRow[];

  return rows
    .map((row) => {
      const article = Array.isArray(row.articles) ? row.articles[0] : row.articles;
      if (!article) return null;
      const source = Array.isArray(article.sources) ? article.sources[0] : article.sources;
      const sharer = profiles.get(row.shared_by);

      return {
        id: row.id,
        note: row.note,
        when: formatRelativeDate(row.created_at),
        sharerName: sharer?.display_name || 'Member',
        sharerSeed: sharer?.avatar_seed || row.shared_by,
        articleId: article.id,
        articleTitle: article.title,
        articleImage: article.image_url,
        sourceName: source?.name ?? null,
      } satisfies ShareItem;
    })
    .filter((item): item is ShareItem => item != null);
}

export default async function SquadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  if (!UUID_RE.test(id)) notFound();

  const squad = await fetchSquad(supabase, id);
  if (!squad) notFound();

  const { members, profiles } = await fetchMembers(supabase, squad.id);
  const shares = await fetchShares(supabase, squad.id, profiles);

  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-7 pb-[60px] pt-[26px]">
      <div className="mb-6 flex items-center gap-4">
        <div
          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl font-display text-[22px] font-bold text-[#0d1016]"
          style={{ background: bannerGradient(squad.id) }}
        >
          {squad.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-[20px] font-bold tracking-[-0.02em] text-text">
            {squad.name}
          </h1>
          <p className="mt-0.5 text-[13.5px] text-muted">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </p>
        </div>
        <InviteButton inviteCode={squad.invite_code} />
        <form action={handleLeave.bind(null, squad.id)}>
          <button
            type="submit"
            className="rounded-[10px] border border-border bg-card px-[18px] py-2.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-text"
          >
            Leave
          </button>
        </form>
      </div>

      {error && (
        <p className="mb-6 text-[13px] text-red-500">
          Couldn&apos;t leave the squad. Try again.
        </p>
      )}

      <div className="grid gap-[26px] lg:grid-cols-[1fr_280px] lg:items-start">
        <section className="flex flex-col gap-3.5">
          <span className="text-[12px] font-semibold uppercase tracking-[.06em] text-faint">
            Shared in this squad
          </span>

          {shares.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-[13.5px] text-muted">
              Nothing shared yet.
            </p>
          ) : (
            shares.map((share) => (
              <div
                key={share.id}
                className="rounded-2xl border border-border bg-card p-3.5"
              >
                <div className="mb-2.5 flex items-center gap-[9px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(share.sharerSeed)}
                    alt=""
                    className="h-[30px] w-[30px] rounded-full border border-border"
                  />
                  <span className="text-[13px] font-semibold text-text">
                    {share.sharerName}
                  </span>
                  <span className="text-[12px] text-faint">
                    shared · {share.when}
                  </span>
                </div>

                <Link
                  href={`/article/${share.articleId}`}
                  className="flex gap-3 rounded-[11px] border border-border bg-card2 p-3"
                >
                  {share.articleImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={share.articleImage}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-[9px] object-cover"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 shrink-0 rounded-[9px]"
                      style={{ background: bannerGradient(share.articleId) }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="line-clamp-2 font-display text-[13.5px] font-semibold leading-[1.32] text-text">
                      {share.articleTitle}
                    </h4>
                    {share.sourceName && (
                      <span className="text-[12px] text-faint">
                        {share.sourceName}
                      </span>
                    )}
                  </div>
                </Link>

                {share.note && (
                  <p className="mt-2.5 text-[13px] italic text-muted">
                    {share.note}
                  </p>
                )}
              </div>
            ))
          )}

          <ShareComposer squadId={squad.id} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <span className="font-display text-[14px] font-semibold text-text">
            Members
          </span>
          <div className="mt-3.5 flex flex-col gap-[11px]">
            {members.map((member) => {
              const profile = profiles.get(member.user_id);
              const name = profile?.display_name || 'Member';
              const seed = profile?.avatar_seed || member.user_id;
              return (
                <div key={member.user_id} className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarUrl(seed)}
                    alt=""
                    className="h-[30px] w-[30px] rounded-full border border-border"
                  />
                  <span className="text-[13px] font-medium text-text">
                    {name}
                  </span>
                  {member.role === 'owner' && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-faint">
                      owner
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
