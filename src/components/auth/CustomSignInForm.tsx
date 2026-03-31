"use client";

import { useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useCallback, useState } from "react";
import { GoogleGLogo } from "@/components/auth/GoogleGLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const REDIRECT = "/practice-overview";

function clerkErrMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const e = err.errors?.[0];
    return e?.longMessage ?? e?.message ?? "Something went wrong. Please try again.";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export function CustomSignInForm({ className }: { className?: string }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaPrepared, setMfaPrepared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsSecondFactor = signIn?.status === "needs_second_factor";

  const resetMfa = useCallback(() => {
    window.location.assign("/sign-in");
  }, []);

  const handleOAuthGoogle = async () => {
    if (!signIn || oauthLoading) return;
    setError(null);
    setOauthLoading(true);
    try {
      const origin = window.location.origin;
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}${REDIRECT}`,
      });
    } catch (err) {
      setError(clerkErrMessage(err));
      setOauthLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !setActive || oauthLoading) return;
    setError(null);
    setSubmitting(true);
    try {
      if (needsSecondFactor) {
        const factors = signIn.supportedSecondFactors ?? [];
        const phone = factors.find((f) => f.strategy === "phone_code");
        const totp = factors.find((f) => f.strategy === "totp");

        if (phone && "phoneNumberId" in phone) {
          if (!mfaPrepared) {
            await signIn.prepareSecondFactor({
              strategy: "phone_code",
              phoneNumberId: phone.phoneNumberId,
            });
            setMfaPrepared(true);
            setSubmitting(false);
            return;
          }
          const res = await signIn.attemptSecondFactor({
            strategy: "phone_code",
            code: mfaCode,
          });
          if (res.status === "complete" && res.createdSessionId) {
            await setActive({ session: res.createdSessionId });
          }
        } else if (totp) {
          const res = await signIn.attemptSecondFactor({
            strategy: "totp",
            code: mfaCode,
          });
          if (res.status === "complete" && res.createdSessionId) {
            await setActive({ session: res.createdSessionId });
          }
        } else {
          setError("This account needs an extra sign-in step we don’t support on this page yet.");
        }
        setSubmitting(false);
        return;
      }

      const res = await signIn.create({
        strategy: "password",
        identifier: email.trim(),
        password,
      });

      if (res.status === "complete" && res.createdSessionId) {
        await setActive({ session: res.createdSessionId });
        setSubmitting(false);
        return;
      }

      if (res.status === "needs_second_factor") {
        const phone = res.supportedSecondFactors?.find((f) => f.strategy === "phone_code");
        if (phone && "phoneNumberId" in phone) {
          await res.prepareSecondFactor({
            strategy: "phone_code",
            phoneNumberId: phone.phoneNumberId,
          });
          setMfaPrepared(true);
        }
        setSubmitting(false);
        return;
      }

      setError("Could not complete sign-in. Try again or reset your password from Clerk.");
    } catch (err) {
      setError(clerkErrMessage(err));
    }
    setSubmitting(false);
  };

  if (!isLoaded) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-white p-8 shadow-sm", className)}>
        <p className="text-center text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md shadow-slate-200/60",
        className
      )}
    >
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-600">
          Welcome back. Continue to your practice dashboard.
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
              : "We sent a code to your phone."}
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
        {!needsSecondFactor ? (
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
              <Label htmlFor="signin-password">Password</Label>
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
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting || oauthLoading}
          className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting ? "Please wait…" : needsSecondFactor ? "Verify" : "Sign in"}
        </Button>
      </form>

      {!needsSecondFactor ? (
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
            disabled={oauthLoading || submitting}
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

      {!needsSecondFactor ? (
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
