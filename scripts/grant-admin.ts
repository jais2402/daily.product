/**
 * Grant admin script.
 *
 * Usage: node --env-file=.env.local node_modules/.bin/tsx scripts/grant-admin.ts <email>
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * Finds the auth user with the given email (paginating through
 * auth.admin.listUsers defensively, since there's no server-side filter by
 * email on that endpoint), then sets profiles.is_admin = true for that
 * user's id. Idempotent — safe to re-run; upserts the profile row if it's
 * somehow missing (the on_auth_user_created trigger normally creates it).
 */

import { createClient } from '@supabase/supabase-js';

const PER_PAGE = 200;

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: npm run grant:admin -- <email>');
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const target = email.trim().toLowerCase();
  let user: Awaited<ReturnType<typeof db.auth.admin.listUsers>>['data']['users'][number] | null = null;
  for (let page = 1; !user; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(error.message);
    user = data.users.find((u) => u.email?.toLowerCase() === target) ?? null;
    if (!user && data.users.length < PER_PAGE) break; // last page
  }

  if (!user) {
    console.error(`No auth user found with email "${email}".`);
    process.exit(1);
  }

  const { error } = await db
    .from('profiles')
    .upsert({ id: user.id, is_admin: true }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  console.log(`Granted admin to ${email} (user id ${user.id}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
