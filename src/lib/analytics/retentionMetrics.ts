import clientPromise from "@/lib/mongodb";

export interface RetentionMetrics {
  dau: number;
  mau: number;
  activeUsersCount: number;
  newUsersCount: number;
  returningUsersCount: number;
  retentionRate: number;
}

export async function getRetentionMetrics(
  startDate: Date,
  endDate: Date,
  isRealtime: boolean = false
): Promise<RetentionMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("prod");

    // Active users: users who had any activity in the period
    const activeUsersData = await db
      .collection("useractivities")
      .aggregate([
        {
          $match: {
            timestampUtc: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$userId",
          },
        },
        {
          $count: "total",
        },
      ])
      .toArray();

    const activeUsersCount = activeUsersData[0]?.total || 0;

    // New users: users who signed up in the period
    let newUsersData = await db
      .collection("useractivities")
      .aggregate([
        {
          $match: {
            eventType: "signup",
            timestampUtc: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: "$userId",
          },
        },
        {
          $count: "total",
        },
      ])
      .toArray();

    let newUsersCount = newUsersData[0]?.total || 0;

    // Fallback: count users created in period
    if (newUsersCount === 0) {
      newUsersCount = await db.collection("users").countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      });
    }

    // Returning users: active users who are not new in this period
    const returningUsersCount = Math.max(0, activeUsersCount - newUsersCount);

    // Retention rate: returning / active
    const retentionRate =
      activeUsersCount > 0 ? (returningUsersCount / activeUsersCount) * 100 : 0;

    // DAU/MAU calculation
    const daysInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // For DAU (used in 24h period), use active users count
    const dau = daysInPeriod <= 1 ? activeUsersCount : 0;

    // For MAU (used in 30d/90d periods), use active users count
    const mau = daysInPeriod >= 28 ? activeUsersCount : 0;

    return {
      dau,
      mau,
      activeUsersCount,
      newUsersCount,
      returningUsersCount,
      retentionRate: parseFloat(retentionRate.toFixed(2)),
    };
  } catch (error) {
    console.error("Error fetching retention metrics:", error);
    return {
      dau: 0,
      mau: 0,
      activeUsersCount: 0,
      newUsersCount: 0,
      returningUsersCount: 0,
      retentionRate: 0,
    };
  }
}
