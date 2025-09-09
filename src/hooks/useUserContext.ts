import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

interface UserContext {
  targetCLB?: string;
  mockScores?: {
    listening?: number;
    reading?: number;
    writing?: number;
    speaking?: number;
  };
  weakAreas?: string[];
  practiceHistory?: {
    totalPractices?: number;
    lastPracticeDate?: string;
    averageScore?: number;
  };
}

export const useUserContext = (): UserContext => {
  const { user } = useUser();

  // Mock data for now - you can replace this with actual API calls
  const { data: userData } = useQuery({
    queryKey: ["userContext", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Here you would fetch actual user data from your API
      // For now, returning mock data
      return {
        targetCLB: "8",
        mockScores: {
          listening: 7,
          reading: 8,
          writing: 6,
          speaking: 7,
        },
        weakAreas: ["Writing", "Speaking"],
        practiceHistory: {
          totalPractices: 15,
          lastPracticeDate: "2024-01-15",
          averageScore: 7.2,
        },
      };
    },
    enabled: !!user,
  });

  return userData || {};
};
