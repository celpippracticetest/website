import clientPromise from "@/lib/mongodb";

export interface SubscriptionMetrics {
  newSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  byPlan: { free: number; premium: number; pro: number };
  churnRate: number;
  conversionRate: number;
}

export async function getSubscriptionMetrics(
  startDate: Date,
  endDate: Date,
  isRealtime: boolean = false
): Promise<SubscriptionMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("test");

    // New subscriptions in the period
    const newSubs = await db.collection("useractivities").countDocuments({
      eventType: "subscription_created",
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Cancelled subscriptions in the period
    const cancelled = await db.collection("useractivities").countDocuments({
      eventType: "subscription_cancelled",
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Current active subscriptions (snapshot)
    const activeSubs = await db.collection("users").countDocuments({
      plan: { $in: ["premium", "pro"] },
      planCancelled: { $ne: true },
    });

    // Subscription breakdown by plan
    const planBreakdown = await db
      .collection("users")
      .aggregate([
        { $match: { plan: { $exists: true } } },
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ])
      .toArray();

    const byPlan = {
      free: 0,
      premium: 0,
      pro: 0,
    };

    planBreakdown.forEach((item: any) => {
      const plan = item._id?.toLowerCase();
      if (plan === "free") byPlan.free = item.count;
      else if (plan === "premium") byPlan.premium = item.count;
      else if (plan === "pro") byPlan.pro = item.count;
    });

    // Calculate churn rate: cancelled / (active + cancelled) in period
    const totalRelevant = activeSubs + cancelled;
    const churnRate =
      totalRelevant > 0 ? (cancelled / totalRelevant) * 100 : 0;

    // Conversion rate: new paid subscriptions / new users in period
    const newUsersInPeriod = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "signup",
        timestamp: { $gte: startDate, $lte: endDate },
      });

    const conversionRate =
      newUsersInPeriod > 0 ? (newSubs / newUsersInPeriod) * 100 : 0;

    return {
      newSubscriptions: newSubs,
      activeSubscriptions: activeSubs,
      cancelledSubscriptions: cancelled,
      byPlan,
      churnRate: isRealtime ? 0 : parseFloat(churnRate.toFixed(2)),
      conversionRate: isRealtime ? 0 : parseFloat(conversionRate.toFixed(2)),
    };
  } catch (error) {
    console.error("Error fetching subscription metrics:", error);
    return {
      newSubscriptions: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      byPlan: { free: 0, premium: 0, pro: 0 },
      churnRate: 0,
      conversionRate: 0,
    };
  }
}
