import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Full authorization decision for /admin/* (except /admin/login, which
 * lives as a sibling outside this route group and is never wrapped by this
 * layout — avoiding a redirect loop).
 *
 * Fail-closed order:
 *   1. Valid legacy `dp_admin` cookie → allow (transition fallback).
 *   2. Signed-in user whose own profile has `is_admin = true` → allow.
 *   3. Otherwise → redirect('/admin/login').
 *
 * proxy.ts no longer makes this decision for /admin/*; it only refreshes
 * the Supabase session and passes requests through, since the layout has
 * DB access and can check `is_admin` safely.
 */
async function assertAdmin() {
  const cookieStore = await cookies();
  const key = cookieStore.get(ADMIN_COOKIE)?.value;
  if (isValidAdminKey(key, process.env.ADMIN_SECRET)) return;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (profile?.is_admin) return;
  }

  redirect('/admin/login');
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await assertAdmin();

  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <header className="mb-6 flex items-center gap-4 border-b pb-4">
        <h1 className="text-lg font-bold">Admin</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:underline">
            Queue
          </Link>
          <Link href="/admin/sources" className="hover:underline">
            Sources
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
