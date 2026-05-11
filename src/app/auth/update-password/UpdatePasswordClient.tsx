"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

type Gate = "checking" | "ready" | "error";

export default function UpdatePasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthCode = searchParams.get("code");
  const [gate, setGate] = useState<Gate>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setGate("error");
      return;
    }

    let cancelled = false;

    const considerSession = (hasUser: boolean) => {
      if (cancelled) return;
      if (hasUser) setGate("ready");
      else setGate("error");
    };

    async function run() {
      if (oauthCode) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(oauthCode);
        if (cancelled) return;
        if (exErr) {
          setGate("error");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      considerSession(Boolean(data.session?.user));
    }

    void run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        considerSession(Boolean(session?.user));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [oauthCode]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (password.length < 8) {
        setError("Use at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        setError("Sign-in is not configured.");
        return;
      }
      setSubmitting(true);
      try {
        const { error: upErr } = await supabase.auth.updateUser({ password });
        if (upErr) {
          setError(upErr.message || "Could not update password.");
          return;
        }
        router.replace("/practice-overview");
        router.refresh();
      } finally {
        setSubmitting(false);
      }
    },
    [confirm, password, router]
  );

  if (gate === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-slate-600">Verifying your reset link…</p>
      </div>
    );
  }

  if (gate === "error") {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Link invalid or expired</h1>
        <p className="text-sm text-slate-600">
          Request a new reset link from{" "}
          <Link href="/sign-in/forgot-supabase" className="font-medium text-blue-600 hover:underline">
            forgot password
          </Link>{" "}
          or sign in with{" "}
          <Link href="/sign-in/clerk" className="font-medium text-blue-600 hover:underline">
            legacy Clerk
          </Link>
          .
        </p>
        <p>
          <Link href="/sign-in" className="text-sm font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter a new password for your email account.
        </p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Confirm password</Label>
            <Input
              id="confirm-pw"
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
            {submitting ? "Please wait…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
