"use client";

import Link from "next/link";
import { useState } from "react";
import { CustomSignInForm } from "@/components/auth/CustomSignInForm";
import { CustomSignUpForm } from "@/components/auth/CustomSignUpForm";

type Mode = "sign-in" | "sign-up";

export default function PartnerAuthClient() {
  const [mode, setMode] = useState<Mode>("sign-in");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/partners"
            className="text-sm font-medium text-orange-700 hover:underline"
          >
            ← Partner program
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Partner {mode === "sign-in" ? "sign in" : "sign up"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use the same account type as the main app (email or Google).
          </p>
        </div>

        <div className="mb-6 flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "sign-in"
                ? "bg-orange-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === "sign-up"
                ? "bg-orange-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {mode === "sign-in" ? (
            <CustomSignInForm redirectAfterAuth="/partners/dashboard" />
          ) : (
            <CustomSignUpForm redirectAfterSignUp="/partners/dashboard" />
          )}
        </div>
      </div>
    </div>
  );
}
