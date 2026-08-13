import { runPracticeSubmitSideEffects } from "@/lib/practiceSubmitSideEffects";

type SubmitAnswersParams = {
  practiceId: string;
  answers: Record<string, string>;
  skill: "Reading" | "Listening";
  timeRemaining: number;
};

export async function submitObjectivePracticeAnswers({
  practiceId,
  answers,
  skill,
  timeRemaining,
}: SubmitAnswersParams): Promise<{ overall?: number } | null> {
  if (Object.keys(answers).length === 0) {
    return null;
  }

  try {
    const response = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practiceId,
        answers,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const overall = result.overall ?? result.result?.overall ?? 0;

    runPracticeSubmitSideEffects({
      practiceId,
      skill,
      overallScore: overall,
      result,
      durationSeconds: timeRemaining,
    });

    return { overall };
  } catch (error) {
    console.error("Failed to submit answers:", error);
    return null;
  }
}

export function buildPracticeUrl(
  skill: "reading" | "listening",
  practiceId: string,
  taskId: string | null,
): string {
  const taskUrl = taskId ? `&taskId=${taskId}` : "";
  return `/${skill}?selectedPracticeId=${practiceId}${taskUrl}`;
}

export function retakeTask(
  skill: "reading" | "listening",
  firstPracticeId: string,
  taskId: string | null,
  router: { push: (url: string) => void },
): void {
  router.push(buildPracticeUrl(skill, firstPracticeId, taskId));
}
