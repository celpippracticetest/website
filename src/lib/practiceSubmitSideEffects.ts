import { ActivityLogger } from "@/lib/userActivity";

export type PracticeSkill = "Listening" | "Reading" | "Writing" | "Speaking";

export type PracticeSubmitSideEffectsInput = {
  practiceId: string;
  skill: PracticeSkill;
  overallScore: number;
  result: Record<string, unknown>;
  durationSeconds: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

/**
 * Activity logging after a practice submit. Runs in the background so the user
 * can see AI feedback as soon as scoring finishes.
 */
export function runPracticeSubmitSideEffects(
  input: PracticeSubmitSideEffectsInput
): void {
  const attemptId = `practice_${input.practiceId}_${Date.now()}`;

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

      if (input.usage) {
        await ActivityLogger.aiFeedbackGenerated(
          "practice",
          input.skill,
          input.usage.prompt_tokens || 0,
          input.usage.completion_tokens || 0,
          attemptId
        );
      }
    } catch (err) {
      console.error("[practiceSubmitSideEffects]", err);
    }
  })();
}
