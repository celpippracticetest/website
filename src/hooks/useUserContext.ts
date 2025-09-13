import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

interface UserContext {
  targetCLB?: string;
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
  const { user } = useUser();

  // Fetch real user data from API
  const { data: userData } = useQuery({
    queryKey: ["userContext", user?.id],
    queryFn: async () => {
      if (!user) return null;

      try {
        const response = await fetch("/api/user-scores");
        if (response.ok) {
          const data = await response.json();
          return {
            targetCLB: data.targetCLB,
            mockScores: data.scoresToUse,
            weakAreas: data.weakAreas,
            practiceHistory: data.practiceHistory,
            scoreSource: data.scoreSource, // "answers_collection"
            answerCounts: data.answerCounts,
          };
        }
      } catch (error) {
        console.error("Error fetching user context:", error);
      }

      // Fallback to empty data if API fails
      return {
        targetCLB: "Not specified",
        mockScores: null,
        weakAreas: [],
        practiceHistory: {
          totalPractices: 0,
          lastPracticeDate: null,
          averageScore: null,
        },
      };
    },
    enabled: !!user,
  });

  return userData || {};
};
