"use client";

import { useSignUp } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import Link from "next/link";
import { useState } from "react";
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

type Step = "details" | "verify";

export function CustomSignUpForm({ className }: { className?: string }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthGoogle = async () => {
    if (!signUp || oauthLoading) return;
    setError(null);
    setOauthLoading(true);
    try {
      const origin = window.location.origin;
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${origin}/sso-callback`,
        redirectUrlComplete: `${origin}${REDIRECT}`,
      });
    } catch (err) {
      setError(clerkErrMessage(err));
      setOauthLoading(false);
    }
  };

  const onSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || !setActive || oauthLoading) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        legalAccepted: true,
      });

      if (created.status === "complete" && created.createdSessionId) {
        await setActive({ session: created.createdSessionId });
        setSubmitting(false);
        return;
      }

      if (created.unverifiedFields?.includes("email_address")) {
        await created.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify");
        setSubmitting(false);
        return;
      }

      if (created.missingFields?.length) {
        setError(`Please complete: ${created.missingFields.join(", ")}`);
        setSubmitting(false);
        return;
      }

      setError("Sign up could not be completed. Please try again.");
    } catch (err) {
      setError(clerkErrMessage(err));
    }
    setSubmitting(false);
  };

  const onSubmitVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || !setActive) return;
    setError(null);
    setSubmitting(true);
    try {
      const verified = await signUp.attemptEmailAddressVerification({ code: code.trim() });

      if (verified.status === "complete" && verified.createdSessionId) {
        await setActive({ session: verified.createdSessionId });
        setSubmitting(false);
        return;
      }

      if (verified.status === "missing_requirements" && verified.missingFields?.length) {
        setError(`Still required: ${verified.missingFields.join(", ")}`);
        setSubmitting(false);
        return;
      }

      setError("Verification did not complete. Check the code and try again.");
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
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Create account</h2>
        <p className="mt-1 text-sm text-slate-600">
          {step === "details"
            ? "Start practicing with full access to your dashboard."
            : "We emailed you a verification code."}
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

      {step === "details" ? (
        <form onSubmit={onSubmitDetails} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="signup-first">First name</Label>
              <Input
                id="signup-first"
                autoComplete="given-name"
                disabled={oauthLoading}
                value={firstName}
                onChange={(ev) => setFirstName(ev.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-last">Last name</Label>
              <Input
                id="signup-last"
                autoComplete="family-name"
                disabled={oauthLoading}
                value={lastName}
                onChange={(ev) => setLastName(ev.target.value)}
                className="border-slate-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
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
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              disabled={oauthLoading}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="border-slate-200"
            />
          </div>

          <p className="text-xs text-slate-500">
            By creating an account you agree to our terms and privacy policy where applicable.
          </p>

          <Button
            type="submit"
            disabled={submitting || oauthLoading}
            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {submitting ? "Please wait…" : "Create account"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSubmitVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-code">Email code</Label>
            <Input
              id="signup-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(ev) => setCode(ev.target.value)}
              className="border-slate-200"
              placeholder="6-digit code"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            {submitting ? "Please wait…" : "Verify email"}
          </Button>
          <button
            type="button"
            className="w-full text-sm font-medium text-blue-600 hover:underline"
            onClick={() => {
              setStep("details");
              setCode("");
              setError(null);
            }}
          >
            Back to details
          </button>
        </form>
      )}

      {step === "details" ? (
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
                Sign up with Google
              </>
            )}
          </Button>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
