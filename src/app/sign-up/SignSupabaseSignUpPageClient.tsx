"use client";

import {
  AuthLoadingCard,
  AuthMarketingShell,
} from "@/components/auth/AuthPageChrome";
import { CustomSupabaseSignUpForm } from "@/components/auth/CustomSupabaseSignUpForm";
import {
  DEFAULT_POST_AUTH_PATH,
  resolvePostAuthRedirect,
} from "@/lib/auth/post-auth-redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SignSupabaseSignUpPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showLegacyAuthSignupHint = searchParams.get("legacy") === "1";
  const redirectAfterAuth = useMemo(() => {
    const raw = searchParams.get("redirect_url");
    if (raw == null || !raw.trim()) return undefined;
    return resolvePostAuthRedirect(raw);
  }, [searchParams]);
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
          const dest = redirectAfterAuth ?? DEFAULT_POST_AUTH_PATH;
          if (dest.startsWith("/api/")) window.location.assign(dest);
          else router.replace(dest);
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
  }, [forceShowForm, redirectAfterAuth, router]);

  if (!ready) {
    return <AuthLoadingCard />;
  }

  return (
    <AuthMarketingShell>
      <h1 className="sr-only">Sign Up</h1>
      <CustomSupabaseSignUpForm
        redirectAfterAuth={redirectAfterAuth}
        showLegacyAuthSignupHint={showLegacyAuthSignupHint}
      />
    </AuthMarketingShell>
  );
}
