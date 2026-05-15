"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AuthMarketingShell } from "@/components/auth/AuthPageChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

export default function ForgotSupabasePasswordClient() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Password reset is not configured.");
      return;
    }
    setSubmitting(true);
    try {
      const origin = window.location.origin;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${origin}/auth/update-password` }
      );
      if (resetErr) {
        setError(resetErr.message || "Could not send reset email.");
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  return (
    <AuthMarketingShell>
      <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-lg">
        <h1 className="text-center text-xl font-extrabold text-[#1B2B5A]">
          Reset password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          For accounts created with email and password on this site. If you use our{" "}
          <Link href="/sign-in?legacy=1" className="font-medium text-blue-600 hover:underline">
            sign-in help for older accounts
          </Link>
          , reset your password there instead.
        </p>

        {sent ? (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-sm text-emerald-900">
            If an account exists for that email, you will receive a link shortly. Check your
            inbox and spam folder.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="border-slate-200"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[linear-gradient(135deg,#1E3A8A_0%,#2563EB_55%,#3B82F6_100%)] font-semibold text-white shadow-md hover:opacity-[0.96]"
            >
              {submitting ? "Please wait…" : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          <Link href="/sign-in" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthMarketingShell>
  );
}
