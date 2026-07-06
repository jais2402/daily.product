import { type NextRequest } from 'next/server';
import { refreshSession } from '@/lib/supabase/proxy-session';

/**
 * Admin authorization for /admin/* now lives entirely in
 * src/app/admin/(gated)/layout.tsx (checks the legacy `dp_admin` cookie
 * OR the signed-in user's `is_admin` profile flag, fail-closed, redirecting
 * to /admin/login). That layout does not wrap /admin/login itself — it's a
 * route-group sibling — so there's no redirect loop.
 *
 * The proxy no longer makes any admin decision: it just refreshes the
 * Supabase session for every matched request (admin included) so auth
 * cookies stay fresh for whichever server component reads them next.
 */
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/ingest|.*\\.(?:svg|png|jpg|ico)$).*)',
  ],
};
