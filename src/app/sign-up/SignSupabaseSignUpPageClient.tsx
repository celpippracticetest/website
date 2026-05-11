"use client";

import { CustomSupabaseSignUpForm } from "@/components/auth/CustomSupabaseSignUpForm";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignSupabaseSignUpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showLegacyClerkSignupHint = searchParams.get("legacy") === "1";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    const hangMs = 12_000;
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, hangMs);

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        if (data.session?.user) {
          router.replace("/practice-overview");
        }
        setReady(true);
      })
      .catch(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Sign Up</h1>
        <CustomSupabaseSignUpForm showLegacyClerkSignupHint={showLegacyClerkSignupHint} />
      </div>
    </div>
  );
}
