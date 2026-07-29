"use client";

import BoltIcon from "@mui/icons-material/Bolt";
import ShieldIcon from "@mui/icons-material/Shield";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuthLiveJoinedBanner } from "@/components/auth/AuthPageChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_POST_AUTH_PATH } from "@/lib/auth/post-auth-redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { trackAuth } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const primaryCtaClass =
  "w-full rounded-xl bg-[linear-gradient(135deg,#1E3A8A_0%,#2563EB_55%,#3B82F6_100%)] font-semibold text-white shadow-md hover:opacity-[0.96]";

function formatSupabaseAuthError(message: string | undefined): string {
  const t = (message ?? "").trim();
  return t || "Something went wrong. Please try again.";
}

export function CustomSupabaseSignUpForm({
  className,
  redirectAfterAuth,
  showLegacyAuthSignupHint = false,
}: {
  className?: string;
  redirectAfterAuth?: string;
  /** From `/sign-up?legacy=1` (old Clerk sign-up URL). */
  showLegacyAuthSignupHint?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dest = redirectAfterAuth ?? DEFAULT_POST_AUTH_PATH;

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
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
          },
        });
        if (signErr) {
          setError(formatSupabaseAuthError(signErr.message));
          return;
        }
        if (data.session) {
          const uid = data.user?.id || data.session.user.id;
          if (uid) {
            trackAuth.signUpCompleted(uid, "email", {
              email: email.trim(),
            });
          }
          if (dest.startsWith("/api/")) window.location.assign(dest);
          else {
            router.push(dest);
            router.refresh();
          }
          return;
        }
        setNotice(
          "Check your email to confirm your address, then sign in here.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [confirm, dest, email, password, router],
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-lg",
        className,
      )}
    >
      <div className="border-b border-slate-100 px-6 pb-5 pt-6 text-center sm:px-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center justify-center gap-2"
        >
          <Image
            src="/images/header-logo-left.png"
            alt=""
            width={32}
            height={32}
            className="hidden h-8 w-8 min-[376px]:block"
            sizes="32px"
          />
          <Image
            src="/images/header-logo-right.png"
            alt="CELPIP Practice Test"
            width={84}
            height={40}
            className="h-8 w-auto max-[375px]:max-w-[140px]"
            sizes="(max-width: 743px) 120px, 84px"
          />
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
          Free to start
        </p>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-[#1B2B5A] sm:text-2xl">
          Create free account
        </h2>
        {showLegacyAuthSignupHint ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950">
            <p className="font-medium">New accounts use this page</p>
            <p className="mt-1 text-amber-900/90">
              The old sign-up link now points here. Create your account with
              email and password, or if you already had an account, go to{" "}
              <Link
                href="/sign-in?legacy=1"
                className="font-medium text-blue-700 underline"
              >
                sign in
              </Link>{" "}
              and use forgot password if needed.
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Create your account with email and password. Already registered?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
            </Link>
            .
          </p>
        )}
      </div>

      <form
        className="space-y-4 px-6 pb-6 pt-6 sm:px-8 sm:pb-8"
        onSubmit={onSubmit}
      >
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
        <Button type="submit" disabled={submitting} className={primaryCtaClass}>
          {submitting ? "Please wait…" : "Create account"}
        </Button>
      </form>

      <div className="border-t border-slate-100 px-6 pb-6 sm:px-8">
        <p className="pt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href={showLegacyAuthSignupHint ? "/sign-in?legacy=1" : "/sign-in"}
            className="font-medium text-blue-600 hover:underline"
          >
            Sign in
          </Link>
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <ShieldIcon sx={{ fontSize: 15, color: "#64748B" }} aria-hidden />
            Bank-level security
          </span>
          <span className="inline-flex items-center gap-1">
            <BoltIcon sx={{ fontSize: 15, color: "#64748B" }} aria-hidden />
            Instant access
          </span>
        </div>

        <AuthLiveJoinedBanner />
      </div>
    </div>
  );
}
