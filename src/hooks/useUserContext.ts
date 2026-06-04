import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useEffect, useState } from "react";

interface UserContext {
  targetCLB?: string;
  onboardingProfile?: {
    testDate?: string | null;
    focusSkill?: string | null;
    targetScore?: number | null;
    subGoal?: string | null;
  };
  mockScores?: {
    listening?: number | null;
    reading?: number | null;
    writing?: number | null;
    speaking?: number | null;
  } | null;
  weakAreas?: string[];
  practiceHistory?: {
    totalPractices?: number;
    lastPracticeDate?: string | null;
    averageScore?: number | null;
  };
  scoreSource?: string; // "answers_collection"
  answerCounts?: {
    writing?: number;
    speaking?: number;
    listening?: number;
    reading?: number;
  };
}

export const useUserContext = (): UserContext => {
  const { user } = useHybridWebUser();
  const [userData, setUserData] = useState<UserContext>({});

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadUserContext = async () => {
      if (!user) {
        setUserData({});
        return;
      }

      try {
        const response = await fetch("/api/user-scores", {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;

          setUserData({
            targetCLB: data.targetCLB,
            onboardingProfile: data.onboardingProfile,
            mockScores: data.scoresToUse,
            weakAreas: data.weakAreas,
            practiceHistory: data.practiceHistory,
            scoreSource: data.scoreSource,
            answerCounts: data.answerCounts,
          });
          return;
        }
      } catch (error) {
        // Ignore fetches aborted on unmount / Fast Refresh — these are not real failures.
        if ((error as Error)?.name === "AbortError" || cancelled) return;
        console.error("Error fetching user context:", error);
      }

      if (cancelled) return;

      setUserData({
        targetCLB: "Not specified",
        onboardingProfile: {
          testDate: null,
          focusSkill: null,
          targetScore: null,
          subGoal: null,
        },
        mockScores: null,
        weakAreas: [],
        practiceHistory: {
          totalPractices: 0,
          lastPracticeDate: null,
          averageScore: null,
        },
      });
    };

    void loadUserContext();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user]);

  return userData || {};
};
