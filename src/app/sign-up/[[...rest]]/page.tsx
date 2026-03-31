import { Suspense } from "react";
import SignUpPageClient from "./SignUpPageClient";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

function SignUpFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-600">Loading…</p>
      </div>
    </div>
  );
}

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/practice-overview");

  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpPageClient />
    </Suspense>
  );
}
