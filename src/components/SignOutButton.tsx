'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useUserStore } from '@/store/user-store';

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const resetUser = useUserStore((s) => s.reset);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await createSupabaseBrowserClient().auth.signOut();
          // Wipe both stores so the next user starts clean.
          resetUser();
          router.refresh();
          router.push('/login');
        });
      }}
      className="rounded px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
