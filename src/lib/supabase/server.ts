// Server-side Supabase client — for Server Components, Server Actions,
// and Route Handlers. Reads/writes cookies via Next's cookie store so the
// auth session is consistent with the middleware.
//
// IMPORTANT: only the anon key is shipped here, per the brief. The service
// role key lives in scripts/ only and is never imported by app code.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // In Server Components, set/remove are no-ops — Next won't let us
        // mutate cookies from a Server Component. The middleware does the
        // actual cookie writes; this client just reads them.
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component during render — ignore.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above.
          }
        },
      },
    },
  );
}
