"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

interface Trophy {
  id: string;
  title: string;
  description: string;
  points: number;
  leagueType: "bronze" | "silver" | "gold";
  icon?: React.ReactNode;
}

interface TrophySystemState {
  isModalOpen: boolean;
  currentTrophy: Trophy | null;
  userPoints: {
    total: number;
    previous: number;
    earned: number;
  };
  timeSpent?: string;
}

export const useTrophySystem = () => {
  const { user } = useUser();
  const [state, setState] = useState<TrophySystemState>({
    isModalOpen: true,
    currentTrophy: null,
    userPoints: { total: 0, previous: 0, earned: 0 },
    timeSpent: undefined,
  });

  // Trophy definitions
  const trophies: Trophy[] = [
    {
      id: "first-practice",
      title: "First Steps",
      description: "Complete your first practice session",
      points: 10,
      leagueType: "bronze",
    },
    {
      id: "first-mock",
      title: "Mock Master",
      description: "Complete your first mock exam",
      points: 20,
      leagueType: "bronze",
    },
    {
      id: "ai-feedback",
      title: "AI Assistant",
      description: "Get AI feedback on your work",
      points: 5,
      leagueType: "bronze",
    },
    {
      id: "bronze-league",
      title: "Bronze Achiever",
      description: "Reach Bronze League (50+ points)",
      points: 50,
      leagueType: "bronze",
    },
    {
      id: "silver-league",
      title: "Silver Star",
      description: "Reach Silver League (100+ points)",
      points: 100,
      leagueType: "silver",
    },
    {
      id: "gold-league",
      title: "Gold Champion",
      description: "Reach Gold League (150+ points)",
      points: 150,
      leagueType: "gold",
    },
    {
      id: "practice-streak",
      title: "Consistent Learner",
      description: "Complete 3 practice sessions in a row",
      points: 30,
      leagueType: "silver",
    },
    {
      id: "mock-master",
      title: "Exam Expert",
      description: "Complete 5 mock exams",
      points: 100,
      leagueType: "gold",
    },
  ];

  // Check for trophy achievements
  const checkTrophyAchievements = useCallback(
    async (pointsEarned: number, pointsType: string, timeSpent?: string) => {
      if (!user) return;

      try {
        // Get current user points from league API
        const response = await fetch("/api/league");
        if (!response.ok) return;

        const data = await response.json();
        const currentTotal = data.userPoints?.overallPoints || 0;
        const previousTotal = currentTotal - pointsEarned;

        // Check for activity-based trophies first (immediate feedback)
        const activityTrophies = trophies.filter(
          (trophy) => !trophy.id.includes("league")
        );

        for (const trophy of activityTrophies) {
          if (shouldShowActivityTrophy(trophy, pointsType, currentTotal)) {
            showTrophy(
              trophy,
              {
                total: currentTotal,
                previous: previousTotal,
                earned: pointsEarned,
              },
              timeSpent
            );
            return; // Show only one trophy at a time
          }
        }

        // Check for league-based trophies
        const leagueTrophies = trophies.filter((trophy) =>
          trophy.id.includes("league")
        );

        for (const trophy of leagueTrophies) {
          const shouldShow =
            previousTotal < trophy.points && currentTotal >= trophy.points;

          if (shouldShow) {
            showTrophy(
              trophy,
              {
                total: currentTotal,
                previous: previousTotal,
                earned: pointsEarned,
              },
              timeSpent
            );
            return; // Show only one trophy at a time
          }
        }
      } catch (error) {
        console.error("Error checking trophy achievements:", error);
      }
    },
    [user]
  );

  // Determine if activity trophy should be shown
  const shouldShowActivityTrophy = (
    trophy: Trophy,
    pointsType: string,
    currentTotal: number
  ): boolean => {
    switch (trophy.id) {
      case "first-practice":
        return pointsType === "practiceSessions" && currentTotal >= 10;
      case "first-mock":
        return pointsType === "mockExams" && currentTotal >= 20;
      case "ai-feedback":
        return pointsType === "aiFeedback";
      case "practice-streak":
        // This would need more complex logic to track streaks
        return false;
      case "mock-master":
        // This would need to track total mock exams completed
        return false;
      default:
        return false;
    }
  };

  // Show trophy modal
  const showTrophy = (
    trophy: Trophy,
    userPoints: { total: number; previous: number; earned: number },
    timeSpent?: string
  ) => {
    setState({
      isModalOpen: true,
      currentTrophy: trophy,
      userPoints,
      timeSpent,
    });
  };

  // Close trophy modal
  const closeTrophy = () => {
    setState((prev) => ({
      ...prev,
      isModalOpen: false,
      currentTrophy: null,
    }));
  };

  // Auto-close modal after 5 seconds
  // useEffect(() => {
  //   if (state.isModalOpen) {
  //     const timer = setTimeout(() => {
  //       closeTrophy();
  //     }, 5000);

  //     return () => clearTimeout(timer);
  //   }
  // }, [state.isModalOpen]);

  return {
    ...state,
    closeTrophy,
    checkTrophyAchievements,
  };
};
