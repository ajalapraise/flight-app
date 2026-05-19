"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user-store";
import { Spinner } from "@/components/Spinner";

export function SignupForm() {
  const router = useRouter();
  const setSession = useUserStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      // If your Supabase project has email confirmation off, session is
      // available immediately. If it's on, the user has to click a link.
      if (data.session && data.user) {
        setSession({
          userId: data.user.id,
          email: data.user.email ?? email,
          token: data.session.access_token,
        });
        router.refresh();
        router.push("/search");
      } else {
        setMessage(
          "Account created. Check your email for the confirmation link, then sign in.",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password</span>
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
        />
        <span className="mt-1 block text-xs text-slate-500">
          At least 6 characters.
        </span>
      </label>
      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending && <Spinner />}
        Create account
      </button>
      <p className="text-center text-sm text-slate-600">
        Already have one?{" "}
        <Link href="/login" className="text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
