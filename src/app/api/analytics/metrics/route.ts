import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSubscriptionMetrics } from "@/lib/analytics/subscriptionMetrics";
import { getRevenueMetrics } from "@/lib/analytics/revenueMetrics";
import { getOnboardingMetrics } from "@/lib/analytics/onboardingMetrics";
import { getEngagementMetrics } from "@/lib/analytics/engagementMetrics";
import { getReferralMetrics } from "@/lib/analytics/referralMetrics";
import { getRetentionMetrics } from "@/lib/analytics/retentionMetrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RangeType = "realtime" | "24h" | "7d" | "30d" | "90d";

function getDateRangeForPeriod(range: RangeType): {
  startDate: Date;
  endDate: Date;
  isRealtime: boolean;
} {
  const endDate = new Date();
  let startDate = new Date();
  let isRealtime = false;

  switch (range) {
    case "realtime":
      // For realtime, use last 5 minutes for some metrics
      startDate = new Date(endDate.getTime() - 5 * 60 * 1000);
      isRealtime = true;
      break;
    case "24h":
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  }

  return { startDate, endDate, isRealtime };
}

/**
 * GET /api/analytics/metrics?range=24h|7d|30d|90d|realtime
 * Returns aggregated marketing metrics from MongoDB for the specified time range
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = (searchParams.get("range") || "24h") as RangeType;

    const { startDate, endDate, isRealtime } = getDateRangeForPeriod(range);

    // Debug: check which database we're connected to
    const client = await clientPromise;
    const db = client.db("prod");
    const usersCount = await db.collection("users").countDocuments();

    console.log(`[Metrics API] Fetching metrics for range: ${range}`, {
      database: db.databaseName,
      totalUsersInDB: usersCount,
      mongoUri: process.env.MONGODB_URI?.substring(0, 30) + "...",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isRealtime,
    });

    // Fetch all metrics in parallel
    const [
      subscriptions,
      revenue,
      onboarding,
      engagement,
      referrals,
      retention,
    ] = await Promise.all([
      getSubscriptionMetrics(startDate, endDate, isRealtime),
      getRevenueMetrics(startDate, endDate, isRealtime),
      getOnboardingMetrics(startDate, endDate),
      getEngagementMetrics(startDate, endDate),
      getReferralMetrics(startDate, endDate),
      getRetentionMetrics(startDate, endDate, isRealtime),
    ]);

    console.log(`[Metrics API] Results for ${range}:`, {
      subscriptions,
      revenue,
      onboarding,
      engagement,
      referrals,
      retention,
    });

    return NextResponse.json({
      success: true,
      range,
      data: {
        subscriptions,
        revenue,
        onboarding,
        engagement,
        referrals,
        retention,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch metrics";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: {
          subscriptions: {
            newSubscriptions: 0,
            activeSubscriptions: 0,
            cancelledSubscriptions: 0,
            byPlan: { free: 0, premium: 0, pro: 0 },
            churnRate: 0,
            conversionRate: 0,
          },
          revenue: {
            totalRevenue: 0,
            currency: "CAD",
            paymentCount: 0,
            byPlan: { premium: 0, pro: 0 },
            averageTransaction: 0,
            refunds: 0,
            disputes: 0,
            mrr: 0,
          },
          onboarding: {
            completionRate: 0,
            totalUsers: 0,
            completedUsers: 0,
          },
          engagement: {
            practiceAttempts: 0,
            practiceCompletions: 0,
            practiceCompletionRate: 0,
            examAttempts: 0,
            examCompletions: 0,
            examCompletionRate: 0,
          },
          referrals: {
            totalInvitations: 0,
            completedInvitations: 0,
            conversionRate: 0,
            totalRevenueFromReferrals: 0,
            averageRevenuePerReferral: 0,
          },
          retention: {
            dau: 0,
            mau: 0,
            activeUsersCount: 0,
            newUsersCount: 0,
            returningUsersCount: 0,
            retentionRate: 0,
          },
        },
      },
      { status: 500 },
    );
  }
}
