import { redirect } from 'next/navigation';
import { getServerSupabase, getSessionUser } from '@/lib/supabase/cached';
import { avatarUrl } from '@/lib/identity';
import { roleLabel, type MemberRole } from '@/lib/roles';
import { currentStreak, activityGrid, weeklyCounts } from '@/lib/streaks';
import { ActivityGrid } from './activity-grid';
import { WeeklyChart } from './weekly-chart';
import { EditForm } from './edit-form';
import { ShareStreakButton } from './share-streak-button';

export const dynamic = 'force-dynamic';

type Topic = { id: string; name: string; slug: string };

interface ProfileRow {
  display_name: string | null;
  avatar_seed: string | null;
  role: MemberRole | null;
  created_at: string;
}

function formatJoined(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export default async function ProfilePage() {
  const supabase = await getServerSupabase();
  // getSessionUser is request-scoped (React `cache()`), shared with
  // sidebar.tsx/topbar-user.tsx when both render in the same request. This
  // page's own profile select (needs `created_at`, which the shared
  // `getOwnProfile` helper doesn't fetch) and its 600-row reads query stay
  // as page-local fetches below.
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: profileRow },
    { data: allTopics },
    { data: myTopicRows },
    { data: readRows },
    { count: readsCount },
    { count: upvotesCount },
    { count: bookmarksCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name,avatar_seed,role,created_at')
      .eq('id', user.id)
      .single(),
    supabase.from('topics').select('id,name,slug').order('name'),
    supabase.from('profile_topics').select('topic_id').eq('profile_id', user.id),
    supabase
      .from('reads')
      .select('read_date')
      .eq('user_id', user.id)
      .order('read_date', { ascending: false })
      .limit(600),
    supabase
      .from('reads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('upvotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const profile = (profileRow ?? null) as ProfileRow | null;
  const topics = (allTopics ?? []) as Topic[];
  const myTopicIds = (myTopicRows ?? []).map((row) => row.topic_id as string);
  const myTopics = topics.filter((t) => myTopicIds.includes(t.id));

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'You';
  const avatarSeed = profile?.avatar_seed || '';
  const role: MemberRole = profile?.role ?? 'other';
  const joined = profile?.created_at ? formatJoined(profile.created_at) : null;

  // `reads` has PK (user_id, article_id, read_date), so each row is one
  // article read on one day — i.e. an article-read event. `readDates` is
  // therefore a raw list of read events (not deduped), and `weeklyCounts`'s
  // default mode sums those events per week to produce a true "articles
  // read per week" chart. Note: the same article read on two different
  // days produces two rows and counts twice here — that's intentional and
  // matches the "Articles read" stat below, which also counts `reads` rows
  // directly (not distinct articles).
  const readDates = (readRows ?? []).map((row) => row.read_date as string);
  const streak = currentStreak(readDates, today);
  const weeks = activityGrid(readDates, today);
  const weekly = weeklyCounts(readDates, today, 12);

  const stats = [
    { value: streak, label: 'Day streak', color: 'var(--amber)' },
    { value: readsCount ?? 0, label: 'Articles read', color: 'var(--green)' },
    { value: upvotesCount ?? 0, label: 'Upvotes given', color: 'var(--blue)' },
    { value: bookmarksCount ?? 0, label: 'Bookmarks', color: 'var(--acc)' },
  ];

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-7 pb-[70px] pt-[26px]">
      <div
        className="mb-6 flex flex-col items-start gap-5 rounded-[18px] border border-border p-6 sm:flex-row sm:items-center"
        style={{
          background:
            'linear-gradient(150deg, rgba(139,124,248,.14), transparent)',
        }}
      >
        {avatarSeed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl(avatarSeed)}
            alt=""
            className="h-[74px] w-[74px] shrink-0 rounded-full border border-border"
          />
        ) : (
          <div
            className="grid h-[74px] w-[74px] shrink-0 place-items-center rounded-full font-display text-[26px] font-bold text-bg"
            style={{ background: 'linear-gradient(140deg, #8b7cf8, #f6a723)' }}
          >
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="flex-1">
          <h1 className="mb-1 font-display text-[24px] font-bold tracking-[-0.02em] text-text">
            {displayName}
          </h1>
          <p className="mb-2.5 text-[14px] text-muted">
            {roleLabel(role)}
            {joined ? ` · Joined ${joined}` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {myTopics.map((t) => (
              <span
                key={t.id}
                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[12px] text-muted"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>

        <EditForm
          displayName={displayName}
          avatarSeed={avatarSeed || ''}
          role={role}
          topics={topics}
          topicIds={myTopicIds}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] border border-border bg-card p-[18px]"
          >
            <div
              className="font-display text-[26px] font-bold leading-none"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
            <div className="mt-[7px] text-[12.5px] text-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-[22px]">
        <div className="mb-[18px] flex items-center justify-between">
          <span className="font-display text-[15.5px] font-semibold text-text">
            Reading activity
          </span>
          <ShareStreakButton streak={streak} />
        </div>
        <ActivityGrid weeks={weeks} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-[22px]">
        <span className="font-display text-[15.5px] font-semibold text-text">
          Reading activity · last 12 weeks
        </span>
        <div className="mt-5">
          <WeeklyChart counts={weekly} />
        </div>
      </div>
    </main>
  );
}
