"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user-store";
import { Spinner } from "@/components/Spinner";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/search";
  const setSession = useUserStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.session || !data.user) {
        setError(
          error?.message ?? "Sign-in failed. Check your email and password.",
        );
        return;
      }
      setSession({
        userId: data.user.id,
        email: data.user.email ?? email,
        token: data.session.access_token,
      });
      router.refresh();
      router.push(next);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />
      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {pending && <Spinner />}
        Sign in
      </button>
      <p className="text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

function Field(props: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      <input
        type={props.type}
        required={props.required}
        autoComplete={props.autoComplete}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500"
      />
    </label>
  );
}
