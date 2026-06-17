"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function OnboardingPage() {
  const { user, isSignedIn } = useHybridWebUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    const hasCompletedOnboarding = (user?.publicMetadata as any)
      ?.onboardingCompleted;

    if (hasCompletedOnboarding) {
      router.push("/practice-overview");
      return;
    }

    const pendingReferralCode = localStorage.getItem("pendingReferralCode");
    console.log(
      "🔍 Onboarding - Pending referral code from localStorage:",
      pendingReferralCode
    );

    if (pendingReferralCode) {
      console.log("✅ Onboarding - Referral code found:", pendingReferralCode);
      applyReferralDiscount(pendingReferralCode);
      localStorage.removeItem("pendingReferralCode");
      localStorage.removeItem("pendingInviterName");
    } else {
      console.log(
        "❌ Onboarding - No pending referral code found in localStorage"
      );
    }

    setLoading(false);
  }, [isSignedIn, user, router]);

  const applyReferralDiscount = async (referralCode: string) => {
    try {
      console.log(
        "🔄 Onboarding - Starting referral discount process for code:",
        referralCode
      );

      const processResponse = await fetch("/api/referrals/process-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode,
        }),
      });

      if (processResponse.ok) {
        console.log(
          "✅ Onboarding - Referral relationship established successfully"
        );

        console.log("🔄 Onboarding - Applying referral discount...");
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
          console.log("✅ Onboarding - Referral discount applied successfully");
        } else {
          const errorData = await discountResponse.json();
          console.error(
            "❌ Onboarding - Failed to apply referral discount:",
            errorData
          );
        }
      } else {
        const errorData = await processResponse.json();
        console.error(
          "❌ Onboarding - Failed to establish referral relationship:",
          errorData
        );
      }
    } catch (error) {
      console.error("❌ Onboarding - Failed to process referral:", error);
    }
  };

  const completeOnboarding = async () => {
    try {
      if (user) {
        console.log("Onboarding completed successfully");
        window.location.href = "/practice-overview";
      }
    } catch (error) {
      console.error("Failed to complete onboarding", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to CELPIP Practice Test! 🎉
          </h1>
          <p className="text-gray-600">
            Let's get you started with your CELPIP preparation journey.
          </p>
        </div>

        {/* Referral Success Message */}
        {(user?.publicMetadata as any)?.referralApplied && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800">
              <strong>🎁 Referral Bonus Applied!</strong>
              <br />
              You've been referred by a friend and will get special benefits!
            </div>
          </div>
        )}

        {/* Referral Discount Applied Message */}
        {(user?.publicMetadata as any)?.referralDiscount &&
          !(user?.publicMetadata as any)?.referralDiscountUsed && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>💰 10% Discount Applied!</strong>
                <br />
                Your referral discount code:{" "}
                {(user?.publicMetadata as any)?.referralDiscount}
                <br />
                <span className="text-xs text-blue-600">
                  This discount will be automatically applied at checkout!
                </span>
              </div>
            </div>
          )}

        {/* Referral Discount Used Message */}
        {(user?.publicMetadata as any)?.referralDiscountUsed && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-800">
              <strong>✅ Referral Discount Used</strong>
              <br />
              You've already used your referral discount on a previous purchase.
              <br />
              <span className="text-xs text-gray-600">
                Thank you for using our referral program!
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What's Next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Explore our practice tests and exercises</li>
              <li>• Take a diagnostic test to assess your level</li>
              <li>• Start practicing with our AI-powered feedback</li>
              <li>• Track your progress and improvement</li>
            </ul>
          </div>

          <button
            onClick={completeOnboarding}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
