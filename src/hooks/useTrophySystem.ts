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
    isModalOpen: false,
    currentTrophy: null,
    userPoints: { total: 0, previous: 0, earned: 0 },
    timeSpent: undefined,
  });

  // Trophy definitions
  const trophies: Trophy[] = [
    {
      id: "first-practice",
      title: "League Entry",
      description: "Welcome to the Bronze League!",
      points: 10,
      leagueType: "bronze",
    },
    {
      id: "silver-league",
      title: "Silver Star",
      description: "Promoted to Silver League!",
      points: 100,
      leagueType: "silver",
    },
    {
      id: "gold-league",
      title: "Gold Champion",
      description: "Promoted to Gold League!",
      points: 150,
      leagueType: "gold",
    },
  ];

  // Check for trophy achievements
  const checkTrophyAchievements = useCallback(
    async (pointsEarned: number, pointsType: string, timeSpent?: string) => {
      if (!user) return;

      try {
        // Get current user points from league API
        const response = await fetch(`/api/league?ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = await response.json();
        const currentTotal = data.userPoints?.overallPoints || 0;
        const previousTotal = currentTotal - pointsEarned;

        // Check for activity-based trophies first (immediate feedback)
        const activityTrophies = trophies.filter(
          (trophy) => !trophy.id.includes("league")
        );

        for (const trophy of activityTrophies) {
          if (shouldShowActivityTrophy(trophy, pointsType, currentTotal, previousTotal)) {
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
    currentTotal: number,
    previousTotal: number
  ): boolean => {
    switch (trophy.id) {
      case "first-practice":
        // Show if we just crossed the 10 point threshold (League Entry)
        // We check for minimal points to ensure they actually have points now
        return previousTotal < 10 && currentTotal >= 10;
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

  return {
    ...state,
    closeTrophy,
    checkTrophyAchievements,
  };
};
