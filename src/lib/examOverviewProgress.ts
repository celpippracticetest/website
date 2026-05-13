import type { TListeningAndReadingAnswerDto, TWritingAnswerDto } from "@/models/answer";

export type ExamProgressSummary = {
  completedParts: number;
  totalParts: number;
  completionPercentage: number;
};

const DEFAULT_EXAM_PART_COUNT = 20;

const getAttemptKey = (attemptId?: string | null) => attemptId || "legacy";

const hasCompletedListeningOrReadingPart = (
  answer: TListeningAndReadingAnswerDto
) =>
  Boolean(
    answer.examId &&
      answer.partId &&
      answer.answers &&
      Object.keys(answer.answers).length > 0
  );

const hasCompletedWritingOrSpeakingPart = (answer: TWritingAnswerDto) => {
  if (!answer.examId || !answer.partId) {
    return false;
  }

  if (answer.audioUrl || answer.text?.trim()) {
    return true;
  }

  if (answer.overalScore !== undefined) {
    return true;
  }

  return Boolean(answer.result && Object.keys(answer.result).length > 0);
};

export function buildExamProgressById({
  examIds,
  examPartCountsById,
  listeningAndReadingAnswers,
  writingAndSpeakingAnswers,
}: {
  examIds: string[];
  examPartCountsById: Record<string, number>;
  listeningAndReadingAnswers: TListeningAndReadingAnswerDto[];
  writingAndSpeakingAnswers: TWritingAnswerDto[];
}): Record<string, ExamProgressSummary> {
  const attemptsByExamId = new Map<string, Map<string, Set<number>>>();

  const registerCompletedPart = (
    examId?: string,
    partId?: number,
    attemptId?: string | null
  ) => {
    if (!examId || !partId) {
      return;
    }

    const normalizedAttemptId = getAttemptKey(attemptId);
    const examAttempts = attemptsByExamId.get(examId) ?? new Map<string, Set<number>>();
    const completedParts = examAttempts.get(normalizedAttemptId) ?? new Set<number>();

    completedParts.add(partId);
    examAttempts.set(normalizedAttemptId, completedParts);
    attemptsByExamId.set(examId, examAttempts);
  };

  listeningAndReadingAnswers
    .filter(hasCompletedListeningOrReadingPart)
    .forEach((answer) => {
      registerCompletedPart(answer.examId, answer.partId, answer.attemptId);
    });

  writingAndSpeakingAnswers
    .filter(hasCompletedWritingOrSpeakingPart)
    .forEach((answer) => {
      registerCompletedPart(answer.examId, answer.partId, answer.attemptId);
    });

  return examIds.reduce<Record<string, ExamProgressSummary>>((acc, examId) => {
    const totalParts = examPartCountsById[examId] ?? DEFAULT_EXAM_PART_COUNT;
    const examAttempts = attemptsByExamId.get(examId);
    const completedParts = examAttempts
      ? Array.from(examAttempts.values()).reduce(
          (maxCompletedParts, completedPartIds) =>
            Math.max(maxCompletedParts, completedPartIds.size),
          0
        )
      : 0;

    acc[examId] = {
      completedParts,
      totalParts,
      completionPercentage:
        totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0,
    };

    return acc;
  }, {});
}
