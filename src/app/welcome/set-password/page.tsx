"use client";

import Link from "next/link";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";

export default function WelcomeSetPasswordPage() {
  const { isSignedIn, isLoaded } = useHybridWebUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FF] px-4 py-12">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FF] px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Secure your account
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in with the email you used at checkout, then set a password from your profile or
          use the password reset flow.
        </p>
        {isSignedIn ? (
          <div className="space-y-6 text-center">
            <p className="text-gray-700">
              You are signed in. Set or change your password from{" "}
              <Link href="/profile" className="text-blue-600 font-medium hover:underline">
                Profile
              </Link>{" "}
              or{" "}
              <Link
                href="/sign-in/forgot-supabase"
                className="text-blue-600 font-medium hover:underline"
              >
                forgot password
              </Link>
              .
            </p>
            <Link
              href="/practice-overview"
              className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700"
            >
              Continue to dashboard
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <SupabaseAuthForm redirectAfterAuth="/welcome/set-password" />
            <p className="mt-6 text-center">
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
