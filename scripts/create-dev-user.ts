/**
 * Create (or confirm) a dev user for password sign-in — bypasses Google OAuth.
 * Run: node --env-file=.env.local node_modules/.bin/tsx scripts/create-dev-user.ts <email> <password> [--admin]
 * Idempotent: existing user keeps its id; password is updated; --admin sets
 * profiles.is_admin=true. Requires DEV_LOGIN=1 in the app env for the login
 * form to appear.
 */
import { createClient } from '@supabase/supabase-js';

async function main() {
  const [email, password, flag] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npm run dev:user -- <email> <password> [--admin]');
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  const db = createClient(url, key, { auth: { persistSession: false } });

  let userId: string | null = null;
  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    // Already exists → find and update password
    const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw new Error(listError.message);
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw new Error(`createUser failed (${createError.message}) and user not found`);
    userId = existing.id;
    const { error: updateError } = await db.auth.admin.updateUserById(userId, { password });
    if (updateError) throw new Error(updateError.message);
    console.log(`Existing user ${email} — password updated.`);
  } else {
    userId = created.user.id;
    console.log(`Created user ${email}.`);
  }

  if (flag === '--admin') {
    const { error: adminError } = await db
      .from('profiles')
      .upsert({ id: userId, is_admin: true }, { onConflict: 'id' });
    if (adminError) throw new Error(adminError.message);
    console.log('is_admin = true set on profile.');
  }
  console.log(`Sign in at /login with the dev form (DEV_LOGIN=1 required).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
