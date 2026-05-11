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

export function CustomSupabaseSignUpForm({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setNotice(null);
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Use at least 8 characters for your password.");
        return;
      }
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setError("Sign-up is not configured.");
        return;
      }
      setSubmitting(true);
      try {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signErr) {
          setError(formatSupabaseAuthError(signErr.message));
          return;
        }
        if (data.session) {
          router.push("/practice-overview");
          router.refresh();
          return;
        }
        setNotice(
          "Check your email to confirm your address, then sign in here."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [confirm, email, password, router]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-8 shadow-sm",
        className
      )}
    >
      <h2 className="text-center text-xl font-semibold text-slate-900">
        Create account
      </h2>
      <p className="mt-2 text-center text-sm text-slate-600">
        Prefer your old Clerk account?{" "}
        <Link href="/sign-up/clerk" className="font-medium text-blue-600 hover:underline">
          Legacy sign-up
        </Link>
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {notice}
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="supa-signup-email">Email</Label>
          <Input
            id="supa-signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supa-signup-password">Password</Label>
          <Input
            id="supa-signup-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="border-slate-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supa-signup-confirm">Confirm password</Label>
          <Input
            id="supa-signup-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(ev) => setConfirm(ev.target.value)}
            className="border-slate-200"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting ? "Please wait…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
