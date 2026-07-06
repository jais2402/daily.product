'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { assertAdminAccess } from '@/lib/admin/access';

const approveSchema = z.object({
  articleId: z.string().uuid(),
  topicIds: z.array(z.string().uuid()).min(1).max(5),
});

export async function approveArticle(input: unknown) {
  if (!(await assertAdminAccess())) return { error: 'Not authorized' };
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) return { error: 'Pick 1-5 topics' };
  const { articleId, topicIds } = parsed.data;
  const db = createAdminSupabase();

  const { error: updateError } = await db
    .from('articles')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', articleId)
    .eq('status', 'pending');
  if (updateError) return { error: updateError.message };

  const { error: topicError } = await db
    .from('article_topics')
    .upsert(topicIds.map((topic_id) => ({ article_id: articleId, topic_id })));
  if (topicError) return { error: topicError.message };

  revalidatePath('/admin');
  return {};
}

export async function rejectArticle(input: unknown) {
  if (!(await assertAdminAccess())) return { error: 'Not authorized' };
  const parsed = z.object({ articleId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: 'Invalid article' };
  const db = createAdminSupabase();
  const { error } = await db
    .from('articles')
    .update({ status: 'rejected' })
    .eq('id', parsed.data.articleId)
    .eq('status', 'pending');
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return {};
}
