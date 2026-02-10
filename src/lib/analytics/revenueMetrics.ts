import clientPromise from "@/lib/mongodb";

export interface RevenueMetrics {
  totalRevenue: number;
  currency: string;
  paymentCount: number;
  byPlan: { premium: number; pro: number };
  averageTransaction: number;
  refunds: number;
  disputes: number;
  mrr: number;
}

export async function getRevenueMetrics(
  startDate: Date,
  endDate: Date,
  isRealtime: boolean = false
): Promise<RevenueMetrics> {
  try {
    const client = await clientPromise;
    const db = client.db("test");

    // Get all successful payments in the period
    const payments = await db
      .collection("useractivities")
      .find({
        eventType: "payment_successful",
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    let totalRevenue = 0;
    let currency = "USD";
    const planRevenue = { premium: 0, pro: 0 };

    payments.forEach((payment: any) => {
      const amount = payment.metadata?.amount || 0;
      const planId = payment.metadata?.planId || "";
      totalRevenue += amount;

      if (payment.metadata?.currency) {
        currency = payment.metadata.currency.toUpperCase();
      }

      if (planId.toLowerCase().includes("premium")) {
        planRevenue.premium += amount;
      } else if (planId.toLowerCase().includes("pro")) {
        planRevenue.pro += amount;
      }
    });

    const paymentCount = payments.length;
    const averageTransaction =
      paymentCount > 0 ? totalRevenue / paymentCount : 0;

    // Get refunds
    const refundedCheckouts = await db
      .collection("checkouts")
      .countDocuments({
        status: "refunded",
        createdAt: { $gte: startDate, $lte: endDate },
      });

    // Get disputes
    const disputes = await db.collection("useractivities").countDocuments({
      eventType: "dispute_created",
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Calculate MRR (Monthly Recurring Revenue)
    // For 30d/90d periods, estimate MRR based on subscription revenue
    const daysInPeriod = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const mrr =
      daysInPeriod > 0 ? (totalRevenue / daysInPeriod) * 30 : totalRevenue;

    return {
      totalRevenue: parseFloat((totalRevenue / 100).toFixed(2)), // Convert cents to dollars
      currency,
      paymentCount,
      byPlan: {
        premium: parseFloat((planRevenue.premium / 100).toFixed(2)),
        pro: parseFloat((planRevenue.pro / 100).toFixed(2)),
      },
      averageTransaction: parseFloat((averageTransaction / 100).toFixed(2)),
      refunds: refundedCheckouts,
      disputes,
      mrr: isRealtime ? 0 : parseFloat((mrr / 100).toFixed(2)),
    };
  } catch (error) {
    console.error("Error fetching revenue metrics:", error);
    return {
      totalRevenue: 0,
      currency: "USD",
      paymentCount: 0,
      byPlan: { premium: 0, pro: 0 },
      averageTransaction: 0,
      refunds: 0,
      disputes: 0,
      mrr: 0,
    };
  }
}
