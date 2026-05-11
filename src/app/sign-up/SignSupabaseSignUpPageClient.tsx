"use client";

import { CustomSupabaseSignUpForm } from "@/components/auth/CustomSupabaseSignUpForm";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignSupabaseSignUpPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        router.replace("/practice-overview");
      }
      setReady(true);
    });
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
        <CustomSupabaseSignUpForm />
      </div>
    </div>
  );
}
