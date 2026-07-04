/**
 * Seed script for initial sources.
 *
 * Usage: node --env-file=.env.local node_modules/.bin/tsx scripts/seed-sources.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * Performs idempotent upsert of STARTER_SOURCES via feed_url conflict clause.
 * On re-run, existing sources are untouched (0 new sources logged).
 */

import { createClient } from '@supabase/supabase-js';
import { STARTER_SOURCES } from './sources';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from('sources')
    .upsert(STARTER_SOURCES, { onConflict: 'feed_url', ignoreDuplicates: true })
    .select('id,name');
  if (error) throw new Error(error.message);
  console.log(`Seeded ${data?.length ?? 0} new sources (existing untouched).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
