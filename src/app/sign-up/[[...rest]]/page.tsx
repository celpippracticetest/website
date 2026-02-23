"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackAuth } from "@/lib/gtm";

export default function SignUpPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string>("");
  const [inviterName, setInviterName] = useState<string>("");

  useEffect(() => {
    // Get referral code from cookies (set by middleware)
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const ref = getCookie("pendingReferralCode") || searchParams.get("ref");
    const inviter =
      getCookie("pendingInviterName") || searchParams.get("inviter");

    if (ref) {
      console.log("Referral code found:", ref);
      setReferralCode(ref);
      // Store referral code in localStorage for after signup processing
      localStorage.setItem("pendingReferralCode", ref);
    }

    if (inviter) {
      console.log("Inviter name found:", inviter);
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
      console.log(
        "🔄 Starting referral discount process for code:",
        referralCode
      );

      // First establish referral relationship
      const processResponse = await fetch("/api/referrals/process-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode,
        }),
      });

      if (processResponse.ok) {
        console.log("✅ Referral relationship established successfully");

        // Then apply discount
        console.log("🔄 Applying referral discount...");
        const discountResponse = await fetch("/api/referrals/apply-discount", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referralCode,
            userId: user?.id,
            userEmail: user?.primaryEmailAddress?.emailAddress,
          }),
        });

        if (discountResponse.ok) {
          console.log("✅ Referral discount applied successfully");
        } else {
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

  useEffect(() => {
    console.log(
      "🔍 useEffect triggered - isSignedIn:",
      isSignedIn,
      "user:",
      !!user
    );

    if (isSignedIn && user) {
      const pendingReferralCode = localStorage.getItem("pendingReferralCode");
      console.log(
        "🔍 Pending referral code from localStorage:",
        pendingReferralCode
      );

      if (pendingReferralCode) {
        console.log("✅ Referral code found:", pendingReferralCode);
        applyReferralDiscount(pendingReferralCode);
        localStorage.removeItem("pendingReferralCode");
        localStorage.removeItem("pendingInviterName");
      } else {
        console.log("❌ No pending referral code found in localStorage");
      }
      router.push("/practice-overview");
    } else {
      console.log("❌ User not signed in or user not available");
    }
  }, [isSignedIn, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Sign Up</h1>
        {referralCode && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-800 mb-2">
              <strong>Referral Code:</strong> {referralCode}
            </div>
            {inviterName && (
              <div className="text-sm text-blue-700">
                Referred by: {inviterName}
              </div>
            )}
            <div className="text-xs text-blue-600 mt-2">
              You'll automatically get 20% off your first purchase!
            </div>
          </div>
        )}

        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
              card: "shadow-lg",
            },
          }}
          forceRedirectUrl="/practice-overview"
          fallbackRedirectUrl="/practice-overview"
        />
      </div>
    </div>
  );
}
