"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  // Don't process referral code here - do it in onboarding page after user is fully authenticated
  useEffect(() => {
    if (isSignedIn && user) {
      // Just redirect to onboarding, referral will be processed there
      router.push("/onboarding");
    }
  }, [isSignedIn, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
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
              You'll automatically get 10% off your first purchase!
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
          afterSignUpUrl="/onboarding"
          redirectUrl="/onboarding"
          signUpMode="modal"
          onError={(error) => {
            console.error("SignUp error:", error);
            if (error.message.includes("Network error")) {
              alert(
                "Network error occurred. Please check your internet connection and try again."
              );
            }
          }}
        />
      </div>
    </div>
  );
}
