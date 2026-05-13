"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy Clerk OAuth callback route — sign-in is handled by Supabase. */
export default function SsoCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/sign-in");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FF]">
      <p className="text-gray-600">Redirecting to sign in…</p>
    </div>
  );
}
