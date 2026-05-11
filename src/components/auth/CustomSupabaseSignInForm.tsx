"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

function formatSupabaseAuthError(message: string | undefined): string {
  const t = (message ?? "").trim();
  return t || "Something went wrong. Please try again.";
}

export function CustomSupabaseSignInForm({
  className,
  redirectAfterAuth,
}: {
  className?: string;
  redirectAfterAuth?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setError("Sign-in is not configured.");
        return;
      }
      setSubmitting(true);
      try {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) {
          setError(formatSupabaseAuthError(signErr.message));
          return;
        }
        const dest = redirectAfterAuth ?? "/practice-overview";
        if (dest.startsWith("/api/")) window.location.assign(dest);
        else router.push(dest);
        router.refresh();
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, redirectAfterAuth, router]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-8 shadow-sm",
        className
      )}
    >
      <h2 className="text-center text-xl font-semibold text-slate-900">
        Sign in
      </h2>
      <p className="mt-2 text-center text-sm text-slate-600">
        New accounts sign in here with email and password. If you created your account
        before we added this login, use{" "}
        <Link href="/sign-in/clerk" className="font-medium text-blue-600 hover:underline">
          legacy Clerk sign-in
        </Link>
        .
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="supa-signin-email">Email</Label>
          <Input
            id="supa-signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="supa-signin-password">Password</Label>
            <Link
              href="/sign-in/forgot-supabase"
              className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="supa-signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="border-slate-200"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting ? "Please wait…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/sign-up" className="font-medium text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-slate-500">
        Password help for an older Clerk-only account:{" "}
        <Link href="/sign-in/clerk" className="font-medium text-blue-600 hover:underline">
          legacy sign-in
        </Link>
      </p>
    </div>
  );
}
