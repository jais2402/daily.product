'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminKey } from '@/lib/admin/gate';

export async function adminLogin(formData: FormData) {
  const key = String(formData.get('key') ?? '');
  if (!isValidAdminKey(key, process.env.ADMIN_SECRET)) {
    redirect('/admin/login?error=1');
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, key, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  redirect('/admin');
}
