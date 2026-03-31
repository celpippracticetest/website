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
    const db = client.db("prod");

    // Get all successful payments in the period
    const payments = await db
      .collection("useractivities")
      .find({
        eventType: "payment_successful",
        timestampUtc: { $gte: startDate, $lte: endDate },
      })
      .toArray();

    let totalRevenue = 0;
    let currency = "CAD"; // Default to CAD for Canadian market
    const planRevenue = { premium: 0, pro: 0 };
    const currencies: Record<string, number> = {};
    let paymentCount = payments.length;

    payments.forEach((payment: any) => {
      const amount = payment.metadata?.amount || 0;
      const planId = payment.metadata?.planId || "";
      const paymentCurrency = (payment.metadata?.currency || "cad").toUpperCase();
      
      totalRevenue += amount;

      // Track currency usage
      currencies[paymentCurrency] = (currencies[paymentCurrency] || 0) + amount;

      // Use the most common currency
      if (payment.metadata?.currency) {
        currency = paymentCurrency;
      }

      const planIdLower = planId.toLowerCase();
      if (planIdLower.includes("premium")) {
        planRevenue.premium += amount;
      } else if (planIdLower.includes("pro") || planIdLower.includes("plus")) {
        planRevenue.pro += amount;
      }
    });

    // Fallback: use checkouts if no payment events
    if (paymentCount === 0) {
      const checkouts = await db
        .collection("checkouts")
        .find({
          status: "complete",
          createdAt: { $gte: startDate, $lte: endDate },
        })
        .toArray();

      paymentCount = checkouts.length;
      // Note: checkouts don't have amount, so revenue will be 0
      // This is expected until payment_successful events are logged
    }
    const averageTransaction =
      paymentCount > 0 ? totalRevenue / paymentCount : 0;

    // Use the primary currency if multiple currencies exist
    if (Object.keys(currencies).length > 0) {
      currency = getPrimaryCurrency(currencies);
    }

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
      timestampUtc: { $gte: startDate, $lte: endDate },
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
      currency: "CAD",
      paymentCount: 0,
      byPlan: { premium: 0, pro: 0 },
      averageTransaction: 0,
      refunds: 0,
      disputes: 0,
      mrr: 0,
    };
  }
}

// Helper function to get the primary currency from multiple currencies
function getPrimaryCurrency(currencies: Record<string, number>): string {
  if (Object.keys(currencies).length === 0) return "CAD";
  
  // Return the currency with the highest total amount
  const sorted = Object.entries(currencies).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}
