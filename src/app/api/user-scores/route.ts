import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/appDocumentsClient";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { PracticeRepository } from "@/repositories/practice.repo";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

type ObjectiveAnswerRecord = Record<string, string>;
type ObjectiveQuestion = {
  id?: string;
  answer?: string;
};

function flattenQuestions(source: unknown): ObjectiveQuestion[] {
  if (!source || typeof source !== "object") {
    return [];
  }

  const passages = (source as { passages?: Array<{ questions?: ObjectiveQuestion[] }> })
    .passages;

  if (!Array.isArray(passages)) {
    return [];
  }

  return passages.flatMap((passage) => passage.questions ?? []);
}

function getStoredOverall(answer: Record<string, any>): number | null {
  if (typeof answer.result?.overall === "number") {
    return answer.result.overall;
  }

  if (typeof answer.overalScore === "number") {
    return answer.overalScore;
  }

  return null;
}

function calculateObjectiveOverall(
  answer: Record<string, any>,
  questions: ObjectiveQuestion[]
): number | null {
  const storedOverall = getStoredOverall(answer);
  if (storedOverall !== null) {
    return storedOverall;
  }

  const submittedAnswers = answer.answers as ObjectiveAnswerRecord | undefined;
  if (!submittedAnswers || questions.length === 0) {
    return null;
  }

  let correctAnswers = 0;
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const submitted =
      submittedAnswers[question.id ?? ""] ?? submittedAnswers[index.toString()];

    if (submitted && question.answer && submitted === question.answer) {
      correctAnswers += 1;
    }
  }

  return Math.round((correctAnswers / questions.length) * 100);
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    if (!authContext?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = authContext.user;

    const db = client.db();
    const practiceRepo = new PracticeRepository(client);
    const examPartsRepo = new ExamPartsRepository(client);
    const practiceCache = new Map<string, Promise<any>>();
    const examPartCache = new Map<string, Promise<any>>();
    const userProfile = (await db.collection("users").findOne(
      matchUsersCollectionByWebUserIds(user.id),
      {
        projection: {
          onboarding: 1,
          intent: 1,
        },
      }
    )) as {
      onboarding?: {
        testDate?: unknown;
        focusSkill?: unknown;
        targetScore?: unknown;
        subGoal?: unknown;
      };
      intent?: { targetScore?: unknown };
    } | null;

    // Get answers from the answers collection
    const answersCollection = db.collection("answers");

    // Get all answers for the user
    const allAnswersRaw = await answersCollection
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

    const allAnswers = allAnswersRaw.filter(
      (doc): doc is Record<string, unknown> => doc != null && typeof doc === "object"
    );

    // Separate answers by type
    const writingAnswers = allAnswers.filter(
      (answer) => answer.type === "WRITING"
    );
    const speakingAnswers = allAnswers.filter(
      (answer) => answer.type === "SPEAKING"
    );
    const listeningAnswers = allAnswers.filter(
      (answer) => answer.type === "LISTENING"
    );
    const readingAnswers = allAnswers.filter(
      (answer) => answer.type === "READING"
    );

    // Calculate scores for each skill
    const scores = {
      writing: null as number | null,
      speaking: null as number | null,
      listening: null as number | null,
      reading: null as number | null,
    };

    const getObjectiveQuestions = async (
      answer: Record<string, any>
    ): Promise<ObjectiveQuestion[]> => {
      if (answer.practiceId) {
        const practiceId = answer.practiceId.toString();
        if (!practiceCache.has(practiceId)) {
          practiceCache.set(practiceId, practiceRepo.findPractice(practiceId));
        }

        return flattenQuestions(await practiceCache.get(practiceId));
      }

      if (answer.examId && answer.partId !== undefined && answer.partId !== null) {
        const examKey = `${answer.examId}:${answer.partId}`;
        if (!examPartCache.has(examKey)) {
          examPartCache.set(
            examKey,
            examPartsRepo.findExamPartByExamIdAndPartId(
              answer.examId.toString(),
              Number(answer.partId)
            )
          );
        }

        return flattenQuestions(await examPartCache.get(examKey));
      }

      return [];
    };

    // Writing scores (from result.overall)
    if (writingAnswers.length > 0) {
      const writingScores = writingAnswers
        .map((answer) => getStoredOverall(answer as Record<string, any>))
        .filter((score): score is number => typeof score === "number");

      if (writingScores.length > 0) {
        scores.writing =
          Math.round(
            (writingScores.reduce((a, b) => a + b, 0) / writingScores.length) *
              10
          ) / 10;
      }
    }

    // Speaking scores (from result.overall)
    if (speakingAnswers.length > 0) {
      const speakingScores = speakingAnswers
        .map((answer) => getStoredOverall(answer as Record<string, any>))
        .filter((score): score is number => typeof score === "number");

      if (speakingScores.length > 0) {
        scores.speaking =
          Math.round(
            (speakingScores.reduce((a, b) => a + b, 0) /
              speakingScores.length) *
              10
          ) / 10;
      }
    }

    // For listening and reading, calculate scores from correct answers
    if (listeningAnswers.length > 0) {
      const listeningScores = (
        await Promise.all(
          listeningAnswers.map(async (answer) =>
            calculateObjectiveOverall(answer, await getObjectiveQuestions(answer))
          )
        )
      )
        .filter((score) => typeof score === "number");

      if (listeningScores.length > 0) {
        scores.listening =
          Math.round(
            (listeningScores.reduce((a, b) => a + b, 0) / listeningScores.length) *
              10
          ) / 10;
      }
    }

    if (readingAnswers.length > 0) {
      const readingScores = (
        await Promise.all(
          readingAnswers.map(async (answer) =>
            calculateObjectiveOverall(answer, await getObjectiveQuestions(answer))
          )
        )
      )
        .filter((score) => typeof score === "number");

      if (readingScores.length > 0) {
        scores.reading =
          Math.round(
            (readingScores.reduce((a, b) => a + b, 0) / readingScores.length) *
              10
          ) / 10;
      }
    }

    // Identify weak areas (scores below 7)
    const weakAreas = [];
    if (scores.listening && scores.listening < 7) weakAreas.push("Listening");
    if (scores.reading && scores.reading < 7) weakAreas.push("Reading");
    if (scores.writing && scores.writing < 7) weakAreas.push("Writing");
    if (scores.speaking && scores.speaking < 7) weakAreas.push("Speaking");

    // Calculate overall average
    const validScores = Object.values(scores).filter(
      (score) => score !== null
    ) as number[];
    const overallAverage =
      validScores.length > 0
        ? Math.round(
            (validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10
          ) / 10
        : null;

    return NextResponse.json({
      targetCLB: user.publicMetadata?.targetCLB || "Not specified",
      scoresToUse: scores,
      weakAreas: weakAreas,
      onboardingProfile: {
        testDate: userProfile?.onboarding?.testDate ?? null,
        focusSkill: userProfile?.onboarding?.focusSkill ?? null,
        targetScore:
          userProfile?.onboarding?.targetScore ??
          userProfile?.intent?.targetScore ??
          null,
        subGoal: userProfile?.onboarding?.subGoal ?? null,
      },
      practiceHistory: {
        totalPractices: allAnswers.length,
        lastPracticeDate:
          allAnswers.length > 0 ? allAnswers[0].createdAt : null,
        averageScore: overallAverage,
      },
      scoreSource: "answers_collection",
      answerCounts: {
        writing: writingAnswers.length,
        speaking: speakingAnswers.length,
        listening: listeningAnswers.length,
        reading: readingAnswers.length,
      },
    });
  } catch (error) {
    console.error("Error fetching user scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch user scores" },
      { status: 500 }
    );
  }
}
