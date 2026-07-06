'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateInviteCode, squadSlug, parseArticleRef } from '@/lib/squads';

interface ActionError {
  error: string;
}

async function getAuthedUserId(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const createSquadSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

/**
 * Create a squad and its owner membership. RLS choreography: `squads`
 * select policy is member-only, so a plain insert-then-select-back would
 * see nothing until membership exists — instead we mint the id ourselves,
 * insert the squad row with no `.select()` (default minimal return, which
 * doesn't require read access), then insert the owner membership. Only
 * after both succeed do we redirect to the squad page (which reads it back
 * under RLS as a now-legitimate member). If the membership insert fails we
 * best-effort delete the now-orphaned (and otherwise invisible) squad row.
 */
export async function createSquad(
  formData: FormData,
): Promise<ActionError | void> {
  const parsed = createSquadSchema.safeParse({
    name: formData.get('name'),
  });
  if (!parsed.success) return { error: 'Squad name must be 2-60 characters' };

  const supabase = await createServerSupabase();
  const userId = await getAuthedUserId(supabase);
  if (!userId) redirect('/login');

  const { name } = parsed.data;
  const id = crypto.randomUUID();

  const { error: squadError } = await supabase.from('squads').insert({
    id,
    name,
    slug: squadSlug(name),
    invite_code: generateInviteCode(),
    created_by: userId,
  });
  if (squadError) return { error: 'Could not create squad' };

  const { error: memberError } = await supabase.from('squad_members').insert({
    squad_id: id,
    user_id: userId,
    role: 'owner',
  });
  if (memberError) {
    await supabase.from('squads').delete().eq('id', id);
    return { error: 'Could not create squad' };
  }

  redirect(`/squads/${id}`);
}

const inviteCodeSchema = z.string().regex(/^[a-z2-7]{16}$/);

/**
 * Join a squad by invite code. Resolving code -> squad requires reading a
 * row the user isn't yet a member of, which the normal `squads` select
 * policy forbids — this is the one sanctioned service-client (RLS-bypass)
 * read in the user-facing flow, deliberately narrowed to a read-only
 * lookup of {id, name}, nothing else. The membership insert itself still
 * goes through the user client under the normal self-insert RLS policy.
 */
export async function joinSquad(code: string): Promise<ActionError | void> {
  const parsed = inviteCodeSchema.safeParse(code);
  if (!parsed.success) return { error: 'Invalid invite' };

  const supabase = await createServerSupabase();
  const userId = await getAuthedUserId(supabase);
  if (!userId) redirect('/login');

  const admin = createAdminSupabase();
  const { data: squad, error: lookupError } = await admin
    .from('squads')
    .select('id,name')
    .eq('invite_code', parsed.data)
    .maybeSingle();
  if (lookupError || !squad) return { error: 'Invalid invite' };

  // Plain insert, not upsert: `squad_members` has no UPDATE policy, and
  // PostgREST's upsert path (even with ignoreDuplicates) issues an
  // ON CONFLICT clause that Postgres validates against an update-capable
  // check, which fails RLS on this insert-only table. A plain insert with a
  // caught unique-violation (23505 = already a member) is idempotent
  // without needing update privileges.
  const { error: memberError } = await supabase.from('squad_members').insert({
    squad_id: squad.id,
    user_id: userId,
    role: 'member',
  });
  if (memberError && memberError.code !== '23505') {
    return { error: 'Could not join squad' };
  }

  redirect(`/squads/${squad.id}`);
}

const shareToSquadSchema = z.object({
  squadId: z.string().uuid(),
  ref: z.string().trim().min(1).max(500),
  note: z.string().trim().max(280).optional(),
});

/**
 * Share an article into a squad. `ref` is whatever the user pasted into the
 * composer — resolved via parseArticleRef into either a direct article id
 * or a URL to look up. Only approved articles are shareable (mirrors the
 * public feed's visibility rule). The insert relies on RLS
 * (`members share`: shared_by = auth.uid() AND is_squad_member(squad_id))
 * to enforce membership — a non-member's insert is rejected by Postgres,
 * which we surface as a friendly error rather than a raw DB message.
 */
export async function shareToSquad(
  input: unknown,
): Promise<ActionError | Record<string, never>> {
  const parsed = shareToSquadSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid share' };

  const supabase = await createServerSupabase();
  const userId = await getAuthedUserId(supabase);
  if (!userId) redirect('/login');

  const { squadId, ref, note } = parsed.data;

  const appOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const parsedRef = parseArticleRef(ref, appOrigin);
  if (!parsedRef) return { error: 'Could not recognize that link' };

  const articleQuery = supabase
    .from('articles')
    .select('id')
    .eq('status', 'approved');

  const { data: article, error: articleError } =
    'articleId' in parsedRef
      ? await articleQuery.eq('id', parsedRef.articleId).maybeSingle()
      : await articleQuery.eq('url', parsedRef.url).maybeSingle();

  if (articleError || !article) return { error: 'Article not found' };

  const { error: shareError } = await supabase.from('squad_shares').insert({
    squad_id: squadId,
    article_id: article.id,
    shared_by: userId,
    note: note || null,
  });
  if (shareError) {
    return { error: 'Could not share to this squad' };
  }

  revalidatePath(`/squads/${squadId}`);
  return {};
}

const squadIdSchema = z.string().uuid();

/** Leave a squad by deleting the caller's own membership row (RLS: self-only). */
export async function leaveSquad(squadId: unknown): Promise<ActionError | void> {
  const parsed = squadIdSchema.safeParse(squadId);
  if (!parsed.success) return { error: 'Invalid squad' };

  const supabase = await createServerSupabase();
  const userId = await getAuthedUserId(supabase);
  if (!userId) redirect('/login');

  const { error } = await supabase
    .from('squad_members')
    .delete()
    .eq('squad_id', parsed.data)
    .eq('user_id', userId);
  if (error) return { error: 'Could not leave squad' };

  redirect('/squads');
}
