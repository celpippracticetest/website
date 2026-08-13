"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackAuth, trackKpi } from "@/lib/analytics";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

function formatSupabaseAuthError(message: string | undefined): string {
  const t = (message ?? "").trim();
  return t || "Something went wrong. Please try again.";
}

export function CustomSupabaseSignInForm({
  className,
  redirectAfterAuth,
  showLegacyClerkAccountHint = false,
}: {
  className?: string;
  redirectAfterAuth?: string;
  /** From `/sign-in?legacy=1` (old Clerk sign-in URL). Explains one-time password reset. */
  showLegacyClerkAccountHint?: boolean;
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
        const { data: signData, error: signErr } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
        if (signErr) {
          setError(formatSupabaseAuthError(signErr.message));
          return;
        }
        const uid = signData.user?.id || signData.session?.user?.id;
        if (uid) {
          let daysSinceLastLogin: number | undefined;
          try {
            const raw = localStorage.getItem("celpip_last_active_at");
            const last = raw ? Number(raw) : NaN;
            if (Number.isFinite(last)) {
              daysSinceLastLogin = Math.floor(
                (Date.now() - last) / (1000 * 60 * 60 * 24),
              );
              if (daysSinceLastLogin >= 14) {
                trackKpi.reactivationSession({
                  daysDormant: daysSinceLastLogin,
                  triggerChannel: "login",
                });
              }
            }
          } catch {
            // ignore
          }
          trackAuth.loginCompleted(uid, "email", daysSinceLastLogin);
        }
        const dest = redirectAfterAuth ?? DEFAULT_POST_AUTH_PATH;
        if (dest.startsWith("/api/")) window.location.assign(dest);
        else router.push(dest);
        router.refresh();
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, redirectAfterAuth, router],
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-8 shadow-sm",
        className,
      )}
    >
      <h2 className="text-center text-xl font-semibold text-slate-900">
        Sign in
      </h2>
      {showLegacyClerkAccountHint ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-medium">Welcome back — same email, new login</p>
          <p className="mt-1 text-amber-900/90">
            Your account was moved to this sign-in page. Use your usual email,
            then{" "}
            <Link
              href="/sign-in/forgot-supabase"
              className="font-medium text-blue-700 underline"
            >
              set a new password here
            </Link>{" "}
            once if you have not already.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in with the email and password for this site. If you still use
          the old Clerk-only link from your bookmarks, it will bring you here —
          use{" "}
          <Link
            href="/sign-in/forgot-supabase"
            className="font-medium text-blue-600 hover:underline"
          >
            forgot password
          </Link>{" "}
          the first time.
        </p>
      )}

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
        <Link
          href="/sign-up"
          className="font-medium text-blue-600 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
