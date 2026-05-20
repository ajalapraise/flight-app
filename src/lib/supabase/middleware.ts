// Lightweight middleware auth check — does NOT create a Supabase client.
// @supabase/supabase-js@2.106.0's RealtimeClient calls WebSocketFactory.getWebSocketConstructor()
// at construction time, which throws on Vercel Edge Runtime. Reading the session
// cookie directly avoids that entirely.

import { NextResponse, type NextRequest } from "next/server";

export function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const requiresAuth =
    path.startsWith("/bookings") || path.startsWith("/confirmation");

  if (requiresAuth) {
    // Supabase SSR stores the session in a cookie named sb-<project-ref>-auth-token
    const hasSession = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
