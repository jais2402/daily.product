import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', user.id)
    .single();
  if (profile?.onboarded_at) redirect('/');

  const { data: topics } = await supabase
    .from('topics')
    .select('id,name,slug')
    .order('name');

  return <OnboardingForm topics={topics ?? []} />;
}
