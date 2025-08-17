"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    // Check if user has completed onboarding
    const hasCompletedOnboarding = (user?.publicMetadata as any)
      ?.onboardingCompleted;

    if (hasCompletedOnboarding) {
      router.push("/practice-overview");
      return;
    }

    // Process referral code if exists
    const pendingReferralCode = localStorage.getItem("pendingReferralCode");
    if (pendingReferralCode) {
      // Store referral code for middleware to process
      console.log("Referral code found:", pendingReferralCode);
      // Clear localStorage
      localStorage.removeItem("pendingReferralCode");
      localStorage.removeItem("pendingInviterName");
    }

    setLoading(false);
  }, [isSignedIn, user, router]);

  const completeOnboarding = async () => {
    try {
      if (user) {
        // Simply redirect to dashboard - middleware will handle metadata update
        console.log("Onboarding completed successfully");
        window.location.href = "/practice-overview";
      }
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
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
