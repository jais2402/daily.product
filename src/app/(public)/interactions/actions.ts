'use server';

import { z } from 'zod';
import { createServerSupabase } from '@/lib/supabase/server';

// NOTE: none of these actions call revalidatePath. The feed/article UI owns
// its own freshness via optimistic client state (useOptimistic/useTransition
// — Task 2), so a full-page revalidation on every upvote/bookmark/read
// click would just add refetch jank without the UI needing it. If a
// non-optimistic consumer needs fresh server data later (e.g. the
// Bookmarks page), it re-fetches on its own navigation.

const articleIdSchema = z.string().uuid();

interface ToggleResult {
  active?: boolean;
  error?: 'auth' | 'invalid' | 'failed';
}

interface LogReadResult {
  error?: 'auth' | 'invalid' | 'failed';
}

async function getAuthedUserId(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Toggle a row in a user-owned interaction table keyed by (user_id,
 * article_id): if it exists, delete it (→ inactive); if not, insert it
 * (→ active). Two round trips (check-then-act) rather than a single
 * atomic op — under RLS "own row" policies this is simple and safe enough;
 * the only race is two rapid clicks from the same user landing as
 * insert+delete in an unexpected order, which just means the final state
 * doesn't match one specific click, not a data-integrity problem (the PK
 * prevents duplicate rows either way).
 */
async function toggleInteraction(
  table: 'bookmarks' | 'upvotes',
  articleId: unknown,
): Promise<ToggleResult> {
  const parsed = articleIdSchema.safeParse(articleId);
  if (!parsed.success) return { error: 'invalid' };

  const supabase = await createServerSupabase();
  const userId = await getAuthedUserId(supabase);
  if (!userId) return { error: 'auth' };

  const { data: existing, error: selectError } = await supabase
    .from(table)
    .select('article_id')
    .eq('user_id', userId)
    .eq('article_id', parsed.data)
    .maybeSingle();
  if (selectError) return { error: 'failed' };

  if (existing) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq('article_id', parsed.data);
    if (deleteError) return { error: 'failed' };
    return { active: false };
  }

  const { error: insertError } = await supabase
    .from(table)
    .insert({ user_id: userId, article_id: parsed.data });
  if (insertError) return { error: 'failed' };
  return { active: true };
}

export async function toggleBookmark(articleId: unknown): Promise<ToggleResult> {
  return toggleInteraction('bookmarks', articleId);
}

export async function toggleUpvote(articleId: unknown): Promise<ToggleResult> {
  return toggleInteraction('upvotes', articleId);
}

/**
 * Record a read for today. `reads` has a (user_id, article_id, read_date)
 * primary key, so re-clicking the same article the same day is a no-op —
 * upsert with ignoreDuplicates skips the write entirely on conflict rather
 * than erroring or re-writing created_at.
 */
export async function logRead(articleId: unknown): Promise<LogReadResult> {
  const parsed = articleIdSchema.safeParse(articleId);
  if (!parsed.success) return { error: 'invalid' };

  const supabase = await createServerSupabase();
  const userId = await getAuthedUserId(supabase);
  if (!userId) return { error: 'auth' };

  const readDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, server clock

  const { error } = await supabase
    .from('reads')
    .upsert(
      { user_id: userId, article_id: parsed.data, read_date: readDate },
      { onConflict: 'user_id,article_id,read_date', ignoreDuplicates: true },
    );
  if (error) return { error: 'failed' };
  return {};
}
