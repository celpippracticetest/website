"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoginModal from "@/components/modal/LoginModal";
import LearningProfileSetup from "@/components/learning/LearningProfileSetup";
import DailyLearningDashboard from "@/components/learning/DailyLearningDashboard";
import { Button } from "@/components/v2/Button";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { parseLearningDayOffset } from "@/lib/learning/dates";
import type { ClbScores } from "@/lib/learning/types";

type ProfileResponse = {
  configured: boolean;
  currentClb?: ClbScores;
  targetClb?: ClbScores;
};

function LearningPageContent() {
  const searchParams = useSearchParams();
  const dayOffset = parseLearningDayOffset(searchParams.get("d"));
  const { isLoaded, isSignedIn } = useHybridWebUser();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/learning/profile");
      if (res.ok) {
        const data = (await res.json()) as ProfileResponse;
        setProfile(data);
        setShowSetup(!data.configured);
      }
    } catch {
      setProfile({ configured: false });
      setShowSetup(true);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadProfile();
    } else {
      setProfile(null);
    }
  }, [isLoaded, isSignedIn, loadProfile]);

  const handleProfileComplete = () => {
    setShowSetup(false);
    setDashboardKey((k) => k + 1);
    void loadProfile();
  };

  const showSeoContent = isLoaded && !isSignedIn;

  return (
    <section className="relative w-full overflow-hidden">
      {showLoginModal && (
        <LoginModal setShowLoginModal={setShowLoginModal} />
      )}

      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 screen744:px-6 screen1280:px-8 pb-10 pt-6 screen1280:pt-[76px]">
          <div className="mx-auto max-w-screen1280 text-center">
            <h1 className="mb-2 text-[28px] font-bold tracking-tight text-text1 screen744:text-[36px] screen1280:text-[44px]">
              Daily CELPIP Learning
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-base text-text2 screen744:text-lg">
              Personalized lessons for all four skills — one tip, guide, and
              drill per day to move you toward your target CLB.
            </p>

            {showSeoContent && (
              <div className="mx-auto mb-8 max-w-3xl space-y-3 text-left text-[15px] leading-relaxed text-text2">
                <p>
                  Set your current and target CLB for Listening, Reading,
                  Writing, and Speaking. Each day you receive a focused lesson
                  with rubric comparisons, vocabulary, exemplars, and actionable
                  drills aligned to real CELPIP tasks.
                </p>
                <p>
                  Complete each skill&apos;s lesson to unlock the next module
                  tomorrow. Lessons are generated once and shared with learners
                  at the same level, so you get premium curriculum without
                  waiting.
                </p>
                <div className="flex justify-center pt-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Sign in to start learning
                  </Button>
                </div>
              </div>
            )}

            {isLoaded && isSignedIn && (
              <div className="mx-auto max-w-screen1280 text-left">
                {loadingProfile ? (
                  <div className="flex justify-center py-20">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary1 border-t-transparent" />
                  </div>
                ) : showSetup ? (
                  <LearningProfileSetup
                    initialCurrent={profile?.currentClb}
                    initialTarget={profile?.targetClb}
                    onComplete={handleProfileComplete}
                  />
                ) : (
                  <DailyLearningDashboard
                    key={dashboardKey}
                    dayOffset={dayOffset}
                    currentClb={profile?.currentClb}
                    targetClb={profile?.targetClb}
                    onEditProfile={() => setShowSetup(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LearningPage() {
  return (
    <Suspense
      fallback={
        <section className="relative w-full overflow-hidden">
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary1 border-t-transparent" />
          </div>
        </section>
      }
    >
      <LearningPageContent />
    </Suspense>
  );
}
