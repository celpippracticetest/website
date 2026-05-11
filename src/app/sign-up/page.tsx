import { Suspense } from "react";
import { redirect } from "next/navigation";
import SignSupabaseSignUpPageClient from "./SignSupabaseSignUpPageClient";
import { hasSupabaseWebSession } from "@/lib/auth/web-session-server";

function readForceAuthScreen(
  sp: Record<string, string | string[] | undefined>
): boolean {
  const v = sp.force;
  if (v === "1") return true;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

function SignUpFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-600">Loading…</p>
      </div>
    </div>
  );
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!readForceAuthScreen(sp) && (await hasSupabaseWebSession())) {
    redirect("/practice-overview");
  }

  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignSupabaseSignUpPageClient />
    </Suspense>
  );
}
