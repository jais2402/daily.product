'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

const onboardingSchema = z.object({
  role: z.enum([
    'pm',
    'apm',
    'designer',
    'marketer',
    'founder',
    'developer',
    'other',
  ]),
  displayName: z.string().trim().min(2).max(40),
  avatarSeed: z.string().min(1).max(64),
  topicIds: z.array(z.string().uuid()).min(1).max(10),
});

export async function completeOnboarding(input: unknown) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input' };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { role, displayName, avatarSeed, topicIds } = parsed.data;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role,
      display_name: displayName,
      avatar_seed: avatarSeed,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', user.id);
  if (profileError) return { error: 'Could not save profile' };

  const { error: deleteError } = await supabase
    .from('profile_topics')
    .delete()
    .eq('profile_id', user.id);
  if (deleteError) return { error: 'Could not save topics' };

  const { error: topicsError } = await supabase
    .from('profile_topics')
    .insert(topicIds.map((topic_id) => ({ profile_id: user.id, topic_id })));
  if (topicsError) return { error: 'Could not save topics' };

  redirect('/');
}
