import { NextResponse } from "next/server";
import clientPromise from "@/lib/appDocumentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/analytics/debug
 * Debug endpoint to check document store connectivity and data availability
 */
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("prod");

    const collectionNames = [
      "useractivities",
      "users",
      "checkouts",
      "onboarding",
      "referralInvitations",
      "referralRewards",
    ];

    // Count documents in key collections
    const userActivitiesCount = await db
      .collection("useractivities")
      .countDocuments();

    const usersCount = await db.collection("users").countDocuments();

    const checkoutsCount = await db.collection("checkouts").countDocuments();

    const onboardingCount = await db.collection("onboarding").countDocuments();

    const referralInvitationsCount = await db
      .collection("referralInvitations")
      .countDocuments();

    const referralRewardsCount = await db
      .collection("referralRewards")
      .countDocuments();

    // Sample referral reward
    const sampleReward = await db
      .collection("referralRewards")
      .find()
      .limit(1)
      .toArray();

    // Get sample event types from useractivities
    const eventTypes = await db
      .collection("useractivities")
      .aggregate([
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray();

    // Get sample users with plans
    const usersWithPlans = await db
      .collection("users")
      .aggregate([
        { $match: { plan: { $exists: true } } },
        { $group: { _id: "$plan", count: { $sum: 1 } } },
      ])
      .toArray();

    // Get a sample activity (most recent)
    const sampleActivity = await db
      .collection("useractivities")
      .find()
      .sort({ timestampUtc: -1 })
      .limit(1)
      .toArray();

    // Get sample users to check structure
    const sampleUsers = await db.collection("users").find().limit(3).toArray();

    // Get sample premium users to check their dates
    const premiumUsers = await db
      .collection("users")
      .find({ plan: { $in: ["premium", "Premium"] } })
      .limit(5)
      .toArray();

    // Check if users have createdAt/updatedAt
    const usersWithDates = await db.collection("users").countDocuments({
      createdAt: { $exists: true },
    });

    const usersWithUpdatedAt = await db.collection("users").countDocuments({
      updatedAt: { $exists: true },
    });

    const usersWithPlanStartedAt = await db.collection("users").countDocuments({
      planStartedAt: { $exists: true },
    });

    // Get sample checkouts
    const sampleCheckouts = await db
      .collection("checkouts")
      .find({ status: "complete" })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    // Get date range of activities
    const dateRange = await db
      .collection("useractivities")
      .aggregate([
        {
          $group: {
            _id: null,
            oldest: { $min: "$timestampUtc" },
            newest: { $max: "$timestampUtc" },
          },
        },
      ])
      .toArray();

    // Check for activities in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivitiesCount = await db
      .collection("useractivities")
      .countDocuments({
        timestampUtc: { $gte: thirtyDaysAgo },
      });

    const recentSignups = await db.collection("useractivities").countDocuments({
      eventType: "signup",
      timestampUtc: { $gte: thirtyDaysAgo },
    });

    const recentPayments = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "payment_successful",
        timestampUtc: { $gte: thirtyDaysAgo },
      });

    const recentSubscriptions = await db
      .collection("useractivities")
      .countDocuments({
        eventType: "subscription_created",
        timestampUtc: { $gte: thirtyDaysAgo },
      });

    return NextResponse.json({
      success: true,
      database: process.env.APP_DOCUMENTS_DB?.trim() || "prod",
      collections: collectionNames,
      counts: {
        useractivities: userActivitiesCount,
        users: usersCount,
        checkouts: checkoutsCount,
        onboarding: onboardingCount,
        referralInvitations: referralInvitationsCount,
        referralRewards: referralRewardsCount,
      },
      sampleReward:
        sampleReward.length > 0 ? sampleReward[0] : "No rewards found",
      eventTypes,
      usersWithPlans,
      dateRange:
        dateRange.length > 0 ?
          (() => {
            const row = dateRange[0] as Record<string, unknown>;
            return {
              oldest: row.oldest,
              newest: row.newest,
            };
          })()
        : null,
      last30Days: {
        total: recentActivitiesCount,
        signups: recentSignups,
        payments: recentPayments,
        subscriptions: recentSubscriptions,
      },
      sampleActivity:
        sampleActivity.length > 0 ? sampleActivity[0] : "No activities found",
      sampleUsers,
      premiumUsers,
      usersDateFields: {
        withCreatedAt: usersWithDates,
        withUpdatedAt: usersWithUpdatedAt,
        withPlanStartedAt: usersWithPlanStartedAt,
        total: usersCount,
      },
      sampleCheckouts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
