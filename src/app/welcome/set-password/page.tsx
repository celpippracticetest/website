"use client";

import { Show, SignInButton, UserProfile } from "@clerk/nextjs";
import Link from "next/link";

export default function WelcomeSetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FF] px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Secure your account
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Create a password so you can sign in to CELPIP Practice anytime. Open
          Security below to add a password.
        </p>
        <Show when="signed-in">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-lg",
              },
            }}
          />
          <p className="text-center mt-8">
            <Link
              href="/practice-overview"
              className="text-blue-600 font-medium hover:underline"
            >
              Continue to dashboard
            </Link>
          </p>
        </Show>
        <Show when="signed-out">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Sign in with the email you used at checkout to set a password.
            </p>
            <SignInButton
              mode="redirect"
              forceRedirectUrl="/welcome/set-password"
            >
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700"
              >
                Sign in
              </button>
            </SignInButton>
            <p>
              <Link href="/" className="text-blue-600 hover:underline">
                Home
              </Link>
            </p>
          </div>
        </Show>
      </div>
    </div>
  );
}
