'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { assertAdminAccess } from '@/lib/admin/access';

const sourceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  site_url: z.string().url(),
  feed_url: z.string().url(),
});

export async function addSource(formData: FormData) {
  if (!(await assertAdminAccess())) return { error: 'Not authorized' };
  const parsed = sourceSchema.safeParse({
    name: formData.get('name'),
    site_url: formData.get('site_url'),
    feed_url: formData.get('feed_url'),
  });
  if (!parsed.success) return { error: 'Invalid source details' };
  const db = createAdminSupabase();
  const { error } = await db.from('sources').insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath('/admin/sources');
  return {};
}

export async function toggleSource(input: unknown) {
  if (!(await assertAdminAccess())) return { error: 'Not authorized' };
  const parsed = z
    .object({ id: z.string().uuid(), to: z.enum(['active', 'paused']) })
    .safeParse(input);
  if (!parsed.success) return { error: 'Invalid toggle' };
  const db = createAdminSupabase();
  const { error } = await db
    .from('sources')
    .update({ status: parsed.data.to, ...(parsed.data.to === 'active' ? { consecutive_failures: 0, last_error: null } : {}) })
    .eq('id', parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath('/admin/sources');
  return {};
}
