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
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { cn } from "@/lib/utils";

const primaryCtaClass =
  "w-full rounded-xl bg-[linear-gradient(135deg,#1E3A8A_0%,#2563EB_55%,#3B82F6_100%)] font-semibold text-white shadow-md hover:opacity-[0.96]";

type AuthMode = "sign-in" | "sign-up";
type EmailMethod = "password" | "magic-link";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-xs text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {message}
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
      {message}
    </div>
  );
}

export function SupabaseAuthForm({
  className,
  initialMode = "sign-in",
  redirectAfterAuth,
  showLegacyAuthHint = false,
}: {
  className?: string;
  initialMode?: AuthMode;
  redirectAfterAuth?: string;
  showLegacyAuthHint?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [emailMethod, setEmailMethod] = useState<EmailMethod>("password");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dest = redirectAfterAuth ?? "/practice-overview";

  const resetState = (nextMode?: AuthMode) => {
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
    if (nextMode) setMode(nextMode);
  };

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setError("Auth is not configured."); return; }
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (oauthErr) setError(oauthErr.message);
  }, [dest]);

  const handleMagicLink = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setNotice(null);
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { setError("Auth is not configured."); return; }
      if (!email.trim()) { setError("Enter your email address."); return; }
      setSubmitting(true);
      try {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
            shouldCreateUser: mode === "sign-up",
          },
        });
        if (otpErr) { setError(otpErr.message); return; }
        setNotice(
          mode === "sign-up"
            ? "Check your inbox — we sent a sign-up link. Click it to confirm and log in."
            : "Check your inbox — we sent a magic link. Click it to sign in."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [email, mode, dest]
  );

  const handlePasswordAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setNotice(null);
      const supabase = createBrowserSupabaseClient();
      if (!supabase) { setError("Auth is not configured."); return; }

      if (mode === "sign-up") {
        if (password !== confirm) { setError("Passwords do not match."); return; }
        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        setSubmitting(true);
        try {
          const { data, error: signErr } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}`,
            },
          });
          if (signErr) { setError(signErr.message); return; }
          if (data.session) {
            if (dest.startsWith("/api/")) window.location.assign(dest);
            else { router.push(dest); router.refresh(); }
            return;
          }
          setNotice("Almost there! Check your inbox and click the confirmation link, then sign in.");
        } finally {
          setSubmitting(false);
        }
        return;
      }

      setSubmitting(true);
      try {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) { setError(signErr.message); return; }
        if (dest.startsWith("/api/")) window.location.assign(dest);
        else { router.push(dest); router.refresh(); }
      } finally {
        setSubmitting(false);
      }
    },
    [email, password, confirm, mode, dest, router]
  );

  const handleForgotPassword = useCallback(async () => {
    setError(null);
    setNotice(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) { setError("Auth is not configured."); return; }
    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetErr) { setError(resetErr.message); return; }
      setNotice("Reset link sent — check your inbox (and spam folder).");
    } finally {
      setSubmitting(false);
    }
  }, [email]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-lg",
        className
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
        <h1 className="mt-1.5 text-xl font-extrabold tracking-tight text-[#1B2B5A] sm:text-2xl">
          {mode === "sign-in" ? "Welcome back" : "Create free account"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "sign-in"
            ? "Sign in to continue practising."
            : "Join thousands improving their CELPIP scores."}
        </p>
      </div>

      <div className="px-4 pb-2 pt-4">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["sign-in", "sign-up"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => resetState(m)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all",
                mode === m
                  ? "bg-white text-[#1B2B5A] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {m === "sign-in" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
        {/* Legacy hint */}
        {showLegacyAuthHint && mode === "sign-in" && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Same email, new login</p>
            <p className="mt-1 text-amber-900/90">
              Your account moved here. Enter your email, then{" "}
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-medium text-blue-700 underline"
              >
                reset your password
              </button>{" "}
              once.
            </p>
          </div>
        )}

        {error && <ErrorBox message={error} />}
        {notice && <SuccessBox message={notice} />}

        {/* Google */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-slate-200 bg-gradient-to-b from-white to-slate-50 font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <GoogleIcon />
          {mode === "sign-in" ? "Sign in with Google" : "Sign up with Google"}
        </Button>

        <Divider label="or continue with email" />

        {/* Method toggle (sign-in only) */}
        {mode === "sign-in" && (
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["password", "magic-link"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setEmailMethod(m); setError(null); setNotice(null); }}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                  emailMethod === m
                    ? "bg-white text-[#1B2B5A] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {m === "password" ? "Password" : "Magic link"}
              </button>
            ))}
          </div>
        )}

        {/* Email field (shared) */}
        <div className="mb-3 space-y-1.5">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-slate-200"
            placeholder="you@example.com"
          />
        </div>

        {/* Magic link form (sign-in with magic link) */}
        {mode === "sign-in" && emailMethod === "magic-link" ? (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <Button
              type="submit"
              disabled={submitting}
              className={primaryCtaClass}
            >
              {submitting ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        ) : null}

        {/* Password form (sign-in password OR sign-up) */}
        {(mode === "sign-in" && emailMethod === "password") || mode === "sign-up" ? (
          <form onSubmit={handlePasswordAuth} className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">Password</Label>
                {mode === "sign-in" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={submitting}
                    className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="auth-password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-200"
              />
            </div>

            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label htmlFor="auth-confirm">Confirm password</Label>
                <Input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="border-slate-200"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className={primaryCtaClass}
            >
              {submitting
                ? "Please wait…"
                : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
            </Button>

            {mode === "sign-up" && (
              <p className="text-center text-xs text-slate-500">
                Or{" "}
                <button
                  type="button"
                  onClick={() => setEmailMethod("magic-link")}
                  className="font-medium text-blue-600 hover:underline"
                >
                  sign up with a magic link
                </button>{" "}
                instead — no password needed.
              </p>
            )}
          </form>
        ) : null}

        {/* Footer switch */}
        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === "sign-in" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => resetState("sign-up")}
                className="font-medium text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => resetState("sign-in")}
                className="font-medium text-blue-600 hover:underline"
              >
                Sign in
              </button>
            </>
          )}
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
