"use client";

import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Same-origin path only (query allowed); blocks open redirects. */
function safeInternalRedirectPath(raw: string | null): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return undefined;
  if (t.includes("://") || t.includes("\\")) return undefined;
  return t;
}

export default function SignSupabasePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  const redirectAfterAuth = useMemo(
    () => safeInternalRedirectPath(searchParams.get("redirect_url")),
    [searchParams]
  );

  const showLegacyAuthHint = searchParams.get("legacy") === "1";
  const initialMode = searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in";

  const forceShowForm = useMemo(() => {
    const f = searchParams.get("force");
    return f === "1" || f?.toLowerCase() === "true";
  }, [searchParams]);

  useEffect(() => {
    const gclid = searchParams.get("gclid");
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");
    const utmTerm = searchParams.get("utm_term");

    if (gclid) localStorage.setItem("pending_gclid", gclid);
    if (utmSource) localStorage.setItem("pending_utm_source", utmSource);
    if (utmMedium) localStorage.setItem("pending_utm_medium", utmMedium);
    if (utmCampaign) localStorage.setItem("pending_utm_campaign", utmCampaign);
    if (utmContent) localStorage.setItem("pending_utm_content", utmContent);
    if (utmTerm) localStorage.setItem("pending_utm_term", utmTerm);
  }, [searchParams]);

  const saveAttribution = async () => {
    try {
      const gclid = localStorage.getItem("pending_gclid");
      const utm_source = localStorage.getItem("pending_utm_source");
      const utm_medium = localStorage.getItem("pending_utm_medium");
      const utm_campaign = localStorage.getItem("pending_utm_campaign");
      const utm_content = localStorage.getItem("pending_utm_content");
      const utm_term = localStorage.getItem("pending_utm_term");

      if (gclid || utm_source || utm_medium || utm_campaign) {
        const response = await fetch("/api/users/update-attribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gclid,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
          }),
        });

        if (response.ok) {
          localStorage.removeItem("pending_gclid");
          localStorage.removeItem("pending_utm_source");
          localStorage.removeItem("pending_utm_medium");
          localStorage.removeItem("pending_utm_campaign");
          localStorage.removeItem("pending_utm_content");
          localStorage.removeItem("pending_utm_term");
        }
      }
    } catch (error) {
      console.error("Failed to save attribution:", error);
    }
  };

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
          void saveAttribution();
          const dest = redirectAfterAuth ?? "/practice-overview";
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-center text-sm text-slate-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Welcome to CELPIP</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in or create a free account to start practising.</p>
        </div>
        <SupabaseAuthForm
          initialMode={initialMode as "sign-in" | "sign-up"}
          redirectAfterAuth={redirectAfterAuth}
          showLegacyAuthHint={showLegacyAuthHint}
        />
      </div>
    </div>
  );
}
