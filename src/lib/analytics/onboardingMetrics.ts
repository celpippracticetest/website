import clientPromise from "@/lib/mongodb";

export interface OnboardingMetrics {
  completionRate: number;
  totalUsers: number;
  completedUsers: number;
}

export async function getOnboardingMetrics(
  startDate: Date,
  endDate: Date,
): Promise<OnboardingMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("prod");

    // Count users who signed up in the period
    let totalUsers = await db.collection("useractivities").countDocuments({
      eventType: "signup",
      timestampUtc: { $gte: startDate, $lte: endDate },
    });

    // Fallback: count users created in period
    if (totalUsers === 0) {
      totalUsers = await db.collection("users").countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      });
    }

    // Count completed onboarding records in the period from a single collection.
    const completedUsers = await db.collection("onboarding").countDocuments({
      answeredAt: { $gte: startDate, $lte: endDate },
      $or: [
        { "answers.stepOneReasons": { $exists: true } },
        { "answers.primaryGoal": { $exists: true } },
        { primaryGoal: { $exists: true } },
      ],
    });

    const completionRate =
      totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

    return {
      completionRate: parseFloat(completionRate.toFixed(2)),
      totalUsers,
      completedUsers,
    };
  } catch (error) {
    console.error("Error fetching onboarding metrics:", error);
    return {
      completionRate: 0,
      totalUsers: 0,
      completedUsers: 0,
    };
  }
}
