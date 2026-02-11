import clientPromise from "@/lib/mongodb";

export interface EngagementMetrics {
  practiceAttempts: number;
  practiceCompletions: number;
  practiceCompletionRate: number;
  examAttempts: number;
  examCompletions: number;
  examCompletionRate: number;
}

export async function getEngagementMetrics(
  startDate: Date,
  endDate: Date,
): Promise<EngagementMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("prod");

    // Practice metrics
    const practiceAttempts = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "practice_attempt_started",
        timestampUtc: { $gte: startDate, $lte: endDate },
      });

    const practiceCompletions = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "practice_attempt_completed",
        timestampUtc: { $gte: startDate, $lte: endDate },
      });

    const practiceCompletionRate =
      practiceAttempts > 0 ? (practiceCompletions / practiceAttempts) * 100 : 0;

    // Exam/Mock metrics
    const examAttempts = await db.collection("useractivities").countDocuments({
      eventType: "mock_attempt_started",
      timestampUtc: { $gte: startDate, $lte: endDate },
    });

    const examCompletions = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "mock_attempt_completed",
        timestampUtc: { $gte: startDate, $lte: endDate },
      });

    const examCompletionRate =
      examAttempts > 0 ? (examCompletions / examAttempts) * 100 : 0;

    return {
      practiceAttempts,
      practiceCompletions,
      practiceCompletionRate: parseFloat(practiceCompletionRate.toFixed(2)),
      examAttempts,
      examCompletions,
      examCompletionRate: parseFloat(examCompletionRate.toFixed(2)),
    };
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return {
      practiceAttempts: 0,
      practiceCompletions: 0,
      practiceCompletionRate: 0,
      examAttempts: 0,
      examCompletions: 0,
      examCompletionRate: 0,
    };
  }
}
