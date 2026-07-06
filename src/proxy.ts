import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';
import { refreshSession } from '@/lib/supabase/proxy-session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin gate stays first and short-circuits for /admin/* — redirect
  // branch doesn't need a session refresh, it never reaches the app.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const key = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!isValidAdminKey(key, process.env.ADMIN_SECRET)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Session refresh runs for every matched request (including admin ones
  // that passed the gate above) so Supabase auth cookies stay fresh.
  return refreshSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/ingest|.*\\.(?:svg|png|jpg|ico)$).*)',
  ],
};
