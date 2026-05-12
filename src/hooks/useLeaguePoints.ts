import { useCallback } from 'react';
import { useHybridWebUser } from '@/hooks/useHybridWebUser';

export const useLeaguePoints = () => {
  const { user } = useHybridWebUser();

  const addPoints = useCallback(async (
    points: number, 
    pointsType: 'mockExams' | 'practiceSessions' | 'aiFeedback' | 'skillsTried' | 'timeSpent',
    timeSpent?: string
  ) => {
    if (!user) {
      console.log("useLeaguePoints: No user found");
      return;
    }

    console.log("useLeaguePoints: Adding points:", { points, pointsType, timeSpent });

    try {
      const response = await fetch('/api/league', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_points',
          points,
          pointsType
        })
      });

      console.log("useLeaguePoints: API response status:", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("useLeaguePoints: API response data:", responseData);
        // Return points data for medal display
        return {
          points,
          timeSpent: timeSpent || `${Math.floor(Math.random() * 30) + 5} minutes`,
          success: true
        };
      } else {
        const text = await response.text();
        let errorData: Record<string, unknown> = { error: "Unknown error" };
        if (text) {
          try {
            errorData = JSON.parse(text) as Record<string, unknown>;
          } catch {
            errorData = { error: "Non-JSON error body", raw: text.slice(0, 300) };
          }
        }
        console.error("League API error:", response.status, errorData);
      }
    } catch (error) {
      console.error('Error adding points:', error);
    }

    return { success: false };
  }, [user]);

  const completeTask = useCallback(async (taskId: string, leagueType: string) => {
    if (!user) return;

    try {
      const response = await fetch('/api/league', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          taskId,
          leagueType
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          points: data.points
        };
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }

    return { success: false };
  }, [user]);

  return {
    addPoints,
    completeTask
  };
};
