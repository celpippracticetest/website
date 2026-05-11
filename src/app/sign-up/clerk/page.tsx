import { Suspense } from "react";
import { redirect } from "next/navigation";
import SignUpClerkPageClient from "./SignUpClerkPageClient";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";

function SignUpFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-600">Loading…</p>
      </div>
    </div>
  );
}

export default async function ClerkLegacySignUpPage() {
  if (await hasAnyWebSession()) redirect("/practice-overview");

  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpClerkPageClient />
    </Suspense>
  );
}
