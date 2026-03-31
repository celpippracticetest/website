"use client";

import { useUser } from "@clerk/nextjs";
import { CustomSignUpForm } from "@/components/auth/CustomSignUpForm";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackAuth } from "@/lib/gtm";

export default function SignUpPageClient() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string>("");
  const [inviterName, setInviterName] = useState<string>("");

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const ref = getCookie("pendingReferralCode") || searchParams.get("ref");
    const inviter =
      getCookie("pendingInviterName") || searchParams.get("inviter");

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

    if (ref) {
      setReferralCode(ref);
      localStorage.setItem("pendingReferralCode", ref);
    }

    if (inviter) {
      setInviterName(decodeURIComponent(inviter));
      localStorage.setItem("pendingInviterName", decodeURIComponent(inviter));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const dedupeKey = `signup_conversion_tracked_${user.id}`;
    if (localStorage.getItem(dedupeKey) === "1") return;

    trackAuth.signUpCompleted(user.id, "email", {
      email: user.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user.firstName || "",
        last_name: user.lastName || "",
      },
    });

    localStorage.setItem(dedupeKey, "1");
  }, [isSignedIn, user]);

  const applyReferralDiscount = async (referralCode: string) => {
    try {
      const processResponse = await fetch("/api/referrals/process-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode,
        }),
      });

      if (processResponse.ok) {
        const discountResponse = await fetch("/api/referrals/apply-discount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referralCode,
            userId: user?.id,
            userEmail: user?.primaryEmailAddress?.emailAddress,
          }),
        });

        if (!discountResponse.ok) {
          const errorData = await discountResponse.json();
          console.error("❌ Failed to apply referral discount:", errorData);
        }
      } else {
        const errorData = await processResponse.json();
        console.error(
          "❌ Failed to establish referral relationship:",
          errorData
        );
      }
    } catch (error) {
      console.error("❌ Failed to process referral:", error);
    }
  };

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
      saveAttribution();

      const pendingReferralCode = localStorage.getItem("pendingReferralCode");

      if (pendingReferralCode) {
        applyReferralDiscount(pendingReferralCode);
        localStorage.removeItem("pendingReferralCode");
        localStorage.removeItem("pendingInviterName");
      }
      router.push("/practice-overview");
    }
  }, [isSignedIn, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Sign Up</h1>
        {referralCode ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 text-sm text-blue-800">
              <strong>Referral Code:</strong> {referralCode}
            </div>
            {inviterName ? (
              <div className="text-sm text-blue-700">
                Referred by: {inviterName}
              </div>
            ) : null}
            <div className="mt-2 text-xs text-blue-600">
              You&apos;ll automatically get 20% off your first purchase!
            </div>
          </div>
        ) : null}

        <CustomSignUpForm />
      </div>
    </div>
  );
}
