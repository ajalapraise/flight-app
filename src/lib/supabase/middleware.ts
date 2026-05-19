// Supabase middleware client — used from src/middleware.ts to refresh the
// auth session cookie on every request. This is what keeps users logged in.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // This single call refreshes the access token if it has expired and
  // writes the new cookie via setAll above.
  const { data } = await supabase.auth.getUser();

  // Route protection: require auth on /bookings/* and /confirmation/*.
  // The flight detail page (/flights/[id]) is public — anonymous visitors
  // can browse the seat map, and the BookingPanel itself sends them to
  // /login at the moment of "Confirm booking".
  const path = request.nextUrl.pathname;
  const requiresAuth =
    path.startsWith("/bookings") || path.startsWith("/confirmation");

  if (requiresAuth && !data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
