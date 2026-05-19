import { ActivityLogger } from "@/lib/userActivity";

export type PracticeSkill = "Listening" | "Reading" | "Writing" | "Speaking";

export type PracticeSubmitSideEffectsInput = {
  practiceId: string;
  skill: PracticeSkill;
  overallScore: number;
  result: Record<string, unknown>;
  durationSeconds: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  pointsAwarded: boolean;
  aiFeedbackPointsAwarded?: boolean;
  onPointsAwarded?: () => void;
  onAiFeedbackPointsAwarded?: () => void;
  addPoints: (
    points: number,
    pointsType: "mockExams" | "practiceSessions" | "aiFeedback" | "skillsTried" | "timeSpent",
    timeSpent?: string
  ) => Promise<unknown>;
  checkTrophyAchievements: (
    points: number,
    pointsType: "mockExams" | "practiceSessions" | "aiFeedback" | "skillsTried" | "timeSpent",
    timeSpent?: string
  ) => Promise<unknown>;
};

/**
 * League, activity, and trophy updates after a practice submit. Runs in the
 * background so the user can see AI feedback as soon as scoring finishes.
 */
export function runPracticeSubmitSideEffects(
  input: PracticeSubmitSideEffectsInput
): void {
  const attemptId = `practice_${input.practiceId}_${Date.now()}`;
  const minutesLabel = `${Math.floor(input.durationSeconds / 60)} minutes`;
  const trophyTimeLabel = `${Math.floor(input.durationSeconds / 60)}:${input.durationSeconds % 60}`;

  void (async () => {
    try {
      await ActivityLogger.practiceCompleted(
        attemptId,
        input.practiceId,
        input.skill,
        input.overallScore,
        input.result,
        input.durationSeconds
      );

      if (!input.pointsAwarded) {
        await input.addPoints(10, "practiceSessions", minutesLabel);
        input.onPointsAwarded?.();
      }

      if (input.usage) {
        await ActivityLogger.aiFeedbackGenerated(
          "practice",
          input.skill,
          input.usage.prompt_tokens || 0,
          input.usage.completion_tokens || 0,
          attemptId
        );

        if (!input.aiFeedbackPointsAwarded) {
          await input.addPoints(5, "aiFeedback");
          input.onAiFeedbackPointsAwarded?.();
        }
      }

      await input.checkTrophyAchievements(10, "practiceSessions", trophyTimeLabel);
    } catch (err) {
      console.error("[practiceSubmitSideEffects]", err);
    }
  })();
}
