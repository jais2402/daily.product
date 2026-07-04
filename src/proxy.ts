import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const key = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!isValidAdminKey(key, process.env.ADMIN_SECRET)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
