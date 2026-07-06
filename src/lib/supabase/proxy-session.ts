import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { publicEnv } from '@/lib/env';

/**
 * Refreshes the Supabase auth session for a proxy-matched request.
 *
 * Mirrors the `updateSession` pattern from the Phase 1 plan (Task 8, Step 3),
 * adapted for Next 16's `proxy.ts` entrypoint: reads cookies off the
 * incoming request, calls `getUser()` to refresh expired tokens, and mirrors
 * any updated cookies onto both the request (so downstream handlers see
 * fresh cookies) and the returned response (so the browser receives them).
 */
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = publicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser(); // refreshes expired tokens
  return response;
}
