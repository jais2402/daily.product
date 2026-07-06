import Link from 'next/link';
import { redirect } from 'next/navigation';
import { assertAdminAccess } from '@/lib/admin/access';

/**
 * Full authorization decision for /admin/* (except /admin/login, which
 * lives as a sibling outside this route group and is never wrapped by this
 * layout — avoiding a redirect loop).
 *
 * The actual decision lives in assertAdminAccess() (src/lib/admin/access.ts)
 * so it can be shared with server actions, which are POSTed directly and
 * bypass this layout's render-time check entirely.
 *
 * proxy.ts no longer makes this decision for /admin/*; it only refreshes
 * the Supabase session and passes requests through, since the layout has
 * DB access and can check `is_admin` safely.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await assertAdminAccess())) redirect('/admin/login');

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
