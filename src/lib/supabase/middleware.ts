// Supabase middleware client — used from src/middleware.ts to refresh the
// auth session cookie on every request. This is what keeps users logged in.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/types';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    },
  );

  // This single call refreshes the access token if it has expired and
  // writes the new cookie via the setters above.
  const { data } = await supabase.auth.getUser();

  // Route protection: require auth on /bookings/* and /confirmation/*.
  // The flight detail page (/flights/[id]) is public — anonymous visitors
  // can browse the seat map, and the BookingPanel itself sends them to
  // /login at the moment of "Confirm booking".
  const path = request.nextUrl.pathname;
  const requiresAuth =
    path.startsWith('/bookings') || path.startsWith('/confirmation');

  if (requiresAuth && !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return response;
}
