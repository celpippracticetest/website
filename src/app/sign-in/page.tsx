import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthLoadingCard } from "@/components/auth/AuthPageChrome";
import SignSupabasePageClient from "./SignSupabasePageClient";
import { hasSupabaseWebSession } from "@/lib/auth/web-session-server";

function readForceAuthScreen(
  sp: Record<string, string | string[] | undefined>
): boolean {
  const v = sp.force;
  if (v === "1") return true;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

function SignInFallback() {
  return <AuthLoadingCard />;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (!readForceAuthScreen(sp) && (await hasSupabaseWebSession())) {
    redirect("/practice-overview");
  }

  return (
    <Suspense fallback={<SignInFallback />}>
      <SignSupabasePageClient />
    </Suspense>
  );
}
