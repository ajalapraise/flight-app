// Header — server component that reads the auth state from cookies and
// renders the nav. Sign-out is delegated to a tiny client component so we
// don't have to ship the whole header as a client bundle.

import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignOutButton } from './SignOutButton';

export async function Header() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/search" className="text-lg font-semibold text-brand-700">
          ✈ Skyline
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link
            href="/search"
            className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            Search
          </Link>
          {user && (
            <Link
              href="/bookings"
              className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              My bookings
            </Link>
          )}
          {user ? (
            <>
              <span className="hidden text-slate-500 sm:inline">
                {user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
