import clientPromise from "@/lib/appDocumentsClient";

export interface ReferralMetrics {
  totalInvitations: number;
  completedInvitations: number;
  conversionRate: number;
  totalRevenueFromReferrals: number;
  averageRevenuePerReferral: number;
}

export async function getReferralMetrics(
  startDate: Date,
  endDate: Date,
): Promise<ReferralMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("prod");

    // Total invitations created in period
    const totalInvitations = await db
      .collection("referralInvitations")
      .countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      });

    // Completed invitations (status: completed) in period
    const completedInvitations = await db
      .collection("referralInvitations")
      .countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        status: "completed",
      });

    const conversionRate =
      totalInvitations > 0 ?
        (completedInvitations / totalInvitations) * 100
      : 0;

    // Total revenue from referrals (from referralRewards)
    const rewards = await db
      .collection("referralRewards")
      .find({
        purchaseDate: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    let totalRevenueFromReferrals = 0;
    rewards.forEach((reward: any) => {
      totalRevenueFromReferrals += reward.purchaseAmount || 0;
    });

    const averageRevenuePerReferral =
      completedInvitations > 0 ?
        totalRevenueFromReferrals / completedInvitations
      : 0;

    return {
      totalInvitations,
      completedInvitations,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      totalRevenueFromReferrals: parseFloat(
        totalRevenueFromReferrals.toFixed(2),
      ),
      averageRevenuePerReferral: parseFloat(
        averageRevenuePerReferral.toFixed(2),
      ),
    };
  } catch (error) {
    console.error("Error fetching referral metrics:", error);
    return {
      totalInvitations: 0,
      completedInvitations: 0,
      conversionRate: 0,
      totalRevenueFromReferrals: 0,
      averageRevenuePerReferral: 0,
    };
  }
}
