"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGLogo } from "@/components/auth/GoogleGLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEFAULT_POST_AUTH_REDIRECT = "/practice-overview";

function formatFutureError(err: { longMessage?: string; message: string } | null | undefined): string {
  if (!err) return "Something went wrong. Please try again.";
  return (err.longMessage?.trim() || err.message || "").trim() || "Something went wrong. Please try again.";
}

function thrownErrMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const e = err.errors?.[0];
    return e?.longMessage ?? e?.message ?? "Something went wrong. Please try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export function CustomSignInForm({
  className,
  redirectAfterAuth,
}: {
  className?: string;
  /** When set (e.g. `/partners/dashboard`), used instead of practice overview after sign-in. */
  redirectAfterAuth?: string;
}) {
  const { isLoaded: authLoaded } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const postAuthPath = redirectAfterAuth?.trim() || DEFAULT_POST_AUTH_REDIRECT;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPrepared, setMfaPrepared] = useState(false);
  const clientTrustEmailSentRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSecondFactor = signIn.status === "needs_second_factor";
  const needsClientTrust = signIn.status === "needs_client_trust";

  const finalizeSession = useCallback(async () => {
    if (!signIn) return;
    const { error: finErr } = await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl(postAuthPath);
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
    if (finErr) setError(formatFutureError(finErr));
  }, [router, signIn, postAuthPath]);

  const resetMfa = useCallback(() => {
    void signIn.reset();
    window.location.assign("/sign-in");
  }, [signIn]);

  const backToSignIn = useCallback(() => {
    setResetMode(false);
    setResetCodeSent(false);
    setResetCode("");
    setNewPassword("");
    setError(null);
    setMfaPrepared(false);
    clientTrustEmailSentRef.current = false;
    void signIn.reset();
    window.location.reload();
  }, [signIn]);

  const handleSendResetCode = async () => {
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: cErr } = await signIn.create({ identifier: email.trim() });
      if (cErr) {
        setError(formatFutureError(cErr));
        setSubmitting(false);
        return;
      }
      const { error: sErr } = await signIn.resetPasswordEmailCode.sendCode();
      if (sErr) setError(formatFutureError(sErr));
      else setResetCodeSent(true);
    } catch (err) {
      setError(thrownErrMessage(err));
    }
    setSubmitting(false);
  };

  const handleSubmitResetPassword = async () => {
    if (!signIn) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: vErr } = await signIn.resetPasswordEmailCode.verifyCode({
        code: resetCode.trim(),
      });
      if (vErr) {
        setError(formatFutureError(vErr));
        setSubmitting(false);
        return;
      }

      if (signIn.status === "needs_new_password") {
        const { error: pErr } = await signIn.resetPasswordEmailCode.submitPassword({
          password: newPassword,
        });
        if (pErr) {
          setError(formatFutureError(pErr));
          setSubmitting(false);
          return;
        }
      }

      if (signIn.status === "complete") {
        await finalizeSession();
        setSubmitting(false);
        return;
      }

      if (signIn.status === "needs_second_factor") {
        setResetMode(false);
        setResetCodeSent(false);
        setResetCode("");
        setNewPassword("");
        setMfaPrepared(false);
        setSubmitting(false);
        return;
      }

      setError("Could not reset password. Please try again.");
    } catch (err) {
      setError(thrownErrMessage(err));
    }
    setSubmitting(false);
  };

  const handleOAuthGoogle = async () => {
    if (!signIn || oauthLoading) return;
    setError(null);
    setOauthLoading(true);
    try {
      const origin = window.location.origin;
      const { error: oErr } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${origin}${postAuthPath}`,
        redirectCallbackUrl: `${origin}/sso-callback`,
      });
      if (oErr) {
        setError(formatFutureError(oErr));
        setOauthLoading(false);
      }
    } catch (err) {
      setError(thrownErrMessage(err));
      setOauthLoading(false);
    }
  };

  const prepareSecondFactor = async (): Promise<boolean> => {
    if (!signIn) return false;
    const factors = signIn.supportedSecondFactors ?? [];
    const phone = factors.find((f) => f.strategy === "phone_code");
    const emailFactor = factors.find((f) => f.strategy === "email_code");

    if (phone) {
      const { error: e } = await signIn.mfa.sendPhoneCode();
      if (e) {
        setError(formatFutureError(e));
        return false;
      }
      return true;
    }
    if (emailFactor) {
      const { error: e } = await signIn.mfa.sendEmailCode();
      if (e) {
        setError(formatFutureError(e));
        return false;
      }
      return true;
    }
    return true;
  };

  const submitSecondFactor = async (): Promise<boolean> => {
    if (!signIn) return false;
    const factors = signIn.supportedSecondFactors ?? [];
    const phone = factors.find((f) => f.strategy === "phone_code");
    const totp = factors.find((f) => f.strategy === "totp");
    const emailFactor = factors.find((f) => f.strategy === "email_code");

    if (phone) {
      const { error: e } = await signIn.mfa.verifyPhoneCode({ code: mfaCode });
      if (e) {
        setError(formatFutureError(e));
        return false;
      }
      return true;
    }
    if (emailFactor) {
      const { error: e } = await signIn.mfa.verifyEmailCode({ code: mfaCode });
      if (e) {
        setError(formatFutureError(e));
        return false;
      }
      return true;
    }
    if (totp) {
      const { error: e } = await signIn.mfa.verifyTOTP({ code: mfaCode });
      if (e) {
        setError(formatFutureError(e));
        return false;
      }
      return true;
    }
    setError("This account needs an extra sign-in step we don’t support on this page yet.");
    return false;
  };

  useEffect(() => {
    if (!signIn || signIn.status !== "needs_client_trust" || clientTrustEmailSentRef.current) return;
    clientTrustEmailSentRef.current = true;
    void signIn.mfa.sendEmailCode().then(({ error: sendErr }) => {
      if (sendErr) {
        setError(formatFutureError(sendErr));
        clientTrustEmailSentRef.current = false;
      }
    });
  }, [signIn, signIn?.status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetMode && !resetCodeSent) {
      await handleSendResetCode();
      return;
    }
    if (resetMode && resetCodeSent) {
      await handleSubmitResetPassword();
      return;
    }
    if (!authLoaded || !signIn || oauthLoading) return;

    setError(null);
    setSubmitting(true);
    try {
      if (needsClientTrust) {
        const { error: verErr } = await signIn.mfa.verifyEmailCode({ code: mfaCode.trim() });
        if (verErr) {
          setError(formatFutureError(verErr));
          setSubmitting(false);
          return;
        }
        if (signIn.status === "complete") await finalizeSession();
        else setError("Verification did not complete. Try again.");
        setSubmitting(false);
        return;
      }

      if (needsSecondFactor) {
        if (!mfaPrepared) {
          const ok = await prepareSecondFactor();
          if (ok) setMfaPrepared(true);
          setSubmitting(false);
          return;
        }
        const ok = await submitSecondFactor();
        if (ok && signIn.status === "complete") await finalizeSession();
        setSubmitting(false);
        return;
      }

      const { error: pwErr } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });
      if (pwErr) {
        setError(formatFutureError(pwErr));
        setSubmitting(false);
        return;
      }

      if (signIn.status === "complete") {
        await finalizeSession();
        setSubmitting(false);
        return;
      }

      if (signIn.status === "needs_client_trust") {
        setSubmitting(false);
        return;
      }

      if (signIn.status === "needs_second_factor") {
        const ok = await prepareSecondFactor();
        if (ok) setMfaPrepared(true);
        setSubmitting(false);
        return;
      }

      setError("Could not complete sign-in. Try again or use Forgot password.");
    } catch (err) {
      setError(thrownErrMessage(err));
    }
    setSubmitting(false);
  };

  if (!authLoaded) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-white p-8 shadow-sm", className)}>
        <p className="text-center text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  const showVerificationUi = needsSecondFactor || needsClientTrust;
  const fetching = fetchStatus === "fetching";

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md shadow-slate-200/60",
        className
      )}
    >
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          {resetMode ? "Reset password" : "Sign in"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {resetMode
            ? resetCodeSent
              ? "Enter the code from your email and choose a new password."
              : "Enter your email and we’ll send you a reset code."
            : needsClientTrust
              ? "Enter the verification code we sent to your email."
              : "Welcome back. Continue to your practice dashboard."}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {needsSecondFactor ? (
        <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Two-step verification</p>
          <p className="mt-1 text-slate-600">
            {mfaPrepared || signIn.supportedSecondFactors?.some((f) => f.strategy === "totp")
              ? "Enter the code from your authenticator app or SMS."
              : "We’ll send a code to verify it’s you."}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-blue-600 hover:underline"
            onClick={resetMfa}
          >
            Use a different email instead
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {!showVerificationUi ? (
          <>
            {resetMode && !resetCodeSent ? (
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={oauthLoading}
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="border-slate-200"
                />
                <p className="text-sm text-slate-600">
                  We&apos;ll send a verification code to this address.
                </p>
              </div>
            ) : resetMode && resetCodeSent ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reset-code">Verification code</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    disabled={oauthLoading}
                    value={resetCode}
                    onChange={(ev) => setResetCode(ev.target.value)}
                    className="border-slate-200"
                    placeholder="Code from email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">New password</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={oauthLoading}
                    value={newPassword}
                    onChange={(ev) => setNewPassword(ev.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={oauthLoading}
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <button
                      type="button"
                      className="shrink-0 text-sm font-medium text-blue-600 hover:underline"
                      onClick={() => {
                        setError(null);
                        setResetMode(true);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={oauthLoading}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    className="border-slate-200"
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="signin-mfa">Verification code</Label>
            <Input
              id="signin-mfa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={mfaCode}
              onChange={(ev) => setMfaCode(ev.target.value)}
              className="border-slate-200"
              placeholder="Enter code"
            />
            {needsClientTrust ? (
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:underline"
                onClick={() => {
                  void signIn.mfa.sendEmailCode().then(({ error: sendErr }) => {
                    if (sendErr) setError(formatFutureError(sendErr));
                  });
                }}
              >
                I need a new code
              </button>
            ) : null}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || oauthLoading || fetching}
          className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting || fetching
            ? "Please wait…"
            : showVerificationUi
              ? needsSecondFactor && !mfaPrepared
                ? "Send code"
                : "Verify"
              : resetMode && !resetCodeSent
                ? "Send reset code"
                : resetMode && resetCodeSent
                  ? "Reset password"
                  : "Sign in"}
        </Button>

        {resetMode && !needsSecondFactor && !needsClientTrust ? (
          <button
            type="button"
            className="w-full text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
            onClick={backToSignIn}
          >
            Back to sign in
          </button>
        ) : null}
      </form>

      {!showVerificationUi && !resetMode ? (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-3 border-[#747775] bg-white text-[14px] font-medium text-[#1f1f1f] shadow-sm hover:bg-[#f8f9fa] hover:text-[#1f1f1f] disabled:opacity-60"
            disabled={oauthLoading || submitting || fetching}
            onClick={handleOAuthGoogle}
            aria-busy={oauthLoading}
          >
            {oauthLoading ? (
              <>
                <span
                  className="size-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-[#4285F4]"
                  aria-hidden
                />
                Redirecting to Google…
              </>
            ) : (
              <>
                <GoogleGLogo className="size-[18px]" />
                Sign in with Google
              </>
            )}
          </Button>
        </>
      ) : null}

      {!showVerificationUi && !resetMode ? (
        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      ) : null}
    </div>
  );
}
