import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = client.db();

    // Get answers from the answers collection
    const answersCollection = db.collection("answers");

    // Get all answers for the user
    const allAnswers = await answersCollection
      .find({ userId: user.id })
      .sort({ createdAt: -1 })
      .toArray();

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

    // Writing scores (from result.overall)
    if (writingAnswers.length > 0) {
      const writingScores = writingAnswers
        .map((answer) => answer.result?.overall)
        .filter((score) => typeof score === "number");

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
        .map((answer) => answer.result?.overall)
        .filter((score) => typeof score === "number");

      if (speakingScores.length > 0) {
        scores.speaking =
          Math.round(
            (speakingScores.reduce((a, b) => a + b, 0) /
              speakingScores.length) *
              10
          ) / 10;
      }
    }

    // For listening and reading, we need to calculate scores from correct answers
    // This is a simplified calculation - you might need to adjust based on your scoring logic
    if (listeningAnswers.length > 0) {
      // This is a placeholder - you'll need to implement actual scoring logic
      // based on how listening questions are scored
      scores.listening = 7.5; // Placeholder
    }

    if (readingAnswers.length > 0) {
      // This is a placeholder - you'll need to implement actual scoring logic
      // based on how reading questions are scored
      scores.reading = 8.0; // Placeholder
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
