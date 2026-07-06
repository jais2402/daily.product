import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function listPending() {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('articles')
    .select('id,title,url,summary,image_url,author,published_at,sources(name)')
    .eq('status', 'pending')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSources() {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from('sources')
    .select('id,name,site_url,feed_url,status,last_fetched_at,last_error,consecutive_failures')
    .order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTopics() {
  const db = createAdminSupabase();
  const { data, error } = await db.from('topics').select('id,name,slug').order('name');
  if (error) throw new Error(error.message);
  return data ?? [];
}
