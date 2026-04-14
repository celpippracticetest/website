import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PartnerAuthClient from "./PartnerAuthClient";

function AuthFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-600">Loading…</p>
    </div>
  );
}

export default async function PartnersAuthPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/partners/dashboard");
  }

  return (
    <Suspense fallback={<AuthFallback />}>
      <PartnerAuthClient />
    </Suspense>
  );
}
