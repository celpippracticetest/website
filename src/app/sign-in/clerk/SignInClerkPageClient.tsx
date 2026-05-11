"use client";

import { useUser } from "@clerk/nextjs";
import { CustomSignInForm } from "@/components/auth/CustomSignInForm";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

/** Same-origin path only (query allowed); blocks open redirects. */
function safeInternalRedirectPath(raw: string | null): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return undefined;
  if (t.includes("://") || t.includes("\\")) return undefined;
  return t;
}

export default function SignInPageClient() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectAfterAuth = useMemo(
    () => safeInternalRedirectPath(searchParams.get("redirect_url")),
    [searchParams]
  );

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
    if (isSignedIn && user) {
      void saveAttribution();
      const dest = redirectAfterAuth ?? "/practice-overview";
      if (dest.startsWith("/api/")) window.location.assign(dest);
      else router.push(dest);
    }
  }, [isSignedIn, user, router, redirectAfterAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Sign In</h1>
        <CustomSignInForm redirectAfterAuth={redirectAfterAuth} />
      </div>
    </div>
  );
}
