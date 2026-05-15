"use client";

import {
  AuthLoadingCard,
  AuthMarketingShell,
} from "@/components/auth/AuthPageChrome";
import { CustomSupabaseSignUpForm } from "@/components/auth/CustomSupabaseSignUpForm";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SignSupabaseSignUpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showLegacyAuthSignupHint = searchParams.get("legacy") === "1";
  const forceShowForm = useMemo(() => {
    const f = searchParams.get("force");
    return f === "1" || f?.toLowerCase() === "true";
  }, [searchParams]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (forceShowForm) {
      setReady(true);
      return;
    }

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
  }, [forceShowForm, router]);

  if (!ready) {
    return <AuthLoadingCard />;
  }

  return (
    <AuthMarketingShell>
      <h1 className="sr-only">Sign Up</h1>
      <CustomSupabaseSignUpForm showLegacyAuthSignupHint={showLegacyAuthSignupHint} />
    </AuthMarketingShell>
  );
}
