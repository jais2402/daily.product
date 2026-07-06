'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabase } from '@/lib/supabase/server';

// Mirrors src/app/onboarding/actions.ts's zod bounds — same table writes,
// own-row RLS — but this action updates an already-onboarded profile and
// deliberately never touches `onboarded_at`.
const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  avatarSeed: z.string().min(1).max(64),
  role: z.enum([
    'pm',
    'apm',
    'designer',
    'marketer',
    'founder',
    'developer',
    'other',
  ]),
  topicIds: z.array(z.string().uuid()).min(1).max(10),
});

export async function updateProfile(input: unknown) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  const { displayName, avatarSeed, role, topicIds } = parsed.data;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      avatar_seed: avatarSeed,
      role,
    })
    .eq('id', user.id);
  if (profileError) return { error: 'Could not save profile' };

  // Replace profile_topics: delete + insert, same as onboarding. There's a
  // known race if a user submits the form twice concurrently (a delete from
  // one request could remove rows just inserted by the other) — acceptable
  // for a single-user-editing-their-own-profile flow.
  const { error: deleteError } = await supabase
    .from('profile_topics')
    .delete()
    .eq('profile_id', user.id);
  if (deleteError) return { error: 'Could not save topics' };

  const { error: topicsError } = await supabase
    .from('profile_topics')
    .insert(topicIds.map((topic_id) => ({ profile_id: user.id, topic_id })));
  if (topicsError) return { error: 'Could not save topics' };

  revalidatePath('/profile');
  return {};
}
