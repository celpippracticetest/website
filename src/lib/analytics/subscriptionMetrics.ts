import clientPromise from "@/lib/appDocumentsClient";

export interface SubscriptionMetrics {
  newSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  byPlan: { free: number; premium: number; pro: number };
  newPremiumInPeriod: number;
  newProInPeriod: number;
  churnRate: number;
  conversionRate: number;
}

export async function getSubscriptionMetrics(
  startDate: Date,
  endDate: Date,
  isRealtime: boolean = false,
): Promise<SubscriptionMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("prod");

    // Count completed checkouts in the period (proxy for new subscriptions)
    const newSubs = await db.collection("checkouts").countDocuments({
      status: "complete",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Count refunded/cancelled checkouts in period
    const cancelled = await db.collection("checkouts").countDocuments({
      status: { $in: ["cancelled", "refunded"] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // ALWAYS show current snapshot of ALL users by plan
    // (Not filtered by period - this shows your entire user base)
    const activeSubs = await db.collection("users").countDocuments({
      plan: { $in: ["plus", "Plus"] },
    });

    // Get current plan distribution for ALL users
    const planBreakdown = await db
      .collection("users")
      .aggregate([{ $group: { _id: "$plan", count: { $sum: 1 } } }])
      .toArray();

    console.log("[SubscriptionMetrics] Plan breakdown:", planBreakdown);

    const byPlan = {
      free: 0,
      premium: 0,
      pro: 0,
    };

    planBreakdown.forEach((item: any) => {
      const plan = String(item._id ?? "").toLowerCase();
      if (plan === "free") byPlan.free = item.count;
      else if (
        plan === "plus" ||
        plan === "premium" ||
        plan === "pro" ||
        plan === "enterprise"
      ) {
        byPlan.pro += item.count;
      }
    });

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const newPlusInPeriod = await db.collection("users").countDocuments({
      plan: { $in: ["plus", "Plus"] },
      "publicMetadata.purchaseDate": { $gte: startDateStr, $lte: endDateStr },
    });

    console.log("[SubscriptionMetrics] New plus in period:", newPlusInPeriod);

    // Calculate churn rate: cancelled / (active + cancelled) in period
    const totalRelevant = activeSubs + cancelled;
    const churnRate = totalRelevant > 0 ? (cancelled / totalRelevant) * 100 : 0;

    // Conversion rate: new paid subscriptions / new users in period
    let newUsersInPeriod = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "signup",
        timestampUtc: { $gte: startDate, $lte: endDate },
      });

    // Fallback: count new users created in period
    if (newUsersInPeriod === 0) {
      newUsersInPeriod = await db.collection("users").countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      });
    }

    const conversionRate =
      newUsersInPeriod > 0 ? (newSubs / newUsersInPeriod) * 100 : 0;

    return {
      newSubscriptions: newSubs,
      activeSubscriptions: activeSubs,
      cancelledSubscriptions: cancelled,
      byPlan,
      newPremiumInPeriod: 0,
      newProInPeriod: isRealtime ? 0 : newPlusInPeriod,
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
      newPremiumInPeriod: 0,
      newProInPeriod: 0,
      churnRate: 0,
      conversionRate: 0,
    };
  }
}
