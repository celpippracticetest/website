import { ActivityLogger } from "@/lib/userActivity";

export type MockSubmitSideEffectsInput = {
  attemptId: string;
  examId: string;
  overallScore?: number;
  result?: Record<string, unknown>;
  durationSeconds: number;
  /** When set, skip trophy checks (single-section mock flow). */
  section?: string | null;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  aiFeedbackSkill?: "Writing" | "Speaking";
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
 * League, activity, and trophy updates after a mock exam part submit.
 * Runs in the background so answer save and navigation are not blocked.
 */
export function runMockSubmitSideEffects(input: MockSubmitSideEffectsInput): void {
  const minutesLabel = `${Math.floor(input.durationSeconds / 60)} minutes`;
  const trophyTimeLabel = `${Math.floor(input.durationSeconds / 60)}:${input.durationSeconds % 60}`;

  void (async () => {
    try {
      await ActivityLogger.mockCompleted(
        input.attemptId,
        input.examId,
        input.overallScore,
        input.result,
        input.durationSeconds
      );

      await input.addPoints(20, "mockExams", minutesLabel);

      if (!input.section) {
        await input.checkTrophyAchievements(20, "mockExams", trophyTimeLabel);
      }

      if (input.usage && input.aiFeedbackSkill) {
        await ActivityLogger.aiFeedbackGenerated(
          "mock",
          input.aiFeedbackSkill,
          input.usage.prompt_tokens || 0,
          input.usage.completion_tokens || 0,
          input.attemptId
        );
        await input.addPoints(5, "aiFeedback");
      }
    } catch (err) {
      console.error("[mockSubmitSideEffects]", err);
    }
  })();
}
