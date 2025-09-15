import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const authenticate = await auth();

    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const db = client.db();
    const userActivityCollection = db.collection("useractivities");

    // Build search filter
    const searchFilter: any = {};
    if (search) {
      searchFilter.$or = [
        { userId: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
        { userAgent: { $regex: search, $options: "i" } },
      ];
    }

    // Get unique users with their latest activity
    const pipeline = [
      { $match: searchFilter },
      {
        $group: {
          _id: "$userId",
          lastActivity: { $max: "$timestampUtc" },
          firstActivity: { $min: "$timestampUtc" },
          totalActivities: { $sum: 1 },
          ipAddresses: { $addToSet: "$ipAddress" },
          userAgents: { $addToSet: "$userAgent" },
          eventTypes: { $addToSet: "$eventType" },
          contexts: { $addToSet: "$context" },
          totalTokens: {
            $sum: { $add: ["$llmTokensPrompt", "$llmTokensCompletion"] },
          },
          practiceAttempts: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "practice_attempt_started"] },
                1,
                0,
              ],
            },
          },
          practiceCompletions: {
            $sum: {
              $cond: [
                { $eq: ["$eventType", "practice_attempt_completed"] },
                1,
                0,
              ],
            },
          },
          mockAttempts: {
            $sum: {
              $cond: [{ $eq: ["$eventType", "mock_attempt_started"] }, 1, 0],
            },
          },
          mockCompletions: {
            $sum: {
              $cond: [{ $eq: ["$eventType", "mock_attempt_completed"] }, 1, 0],
            },
          },
          paymentEvents: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$eventType",
                    [
                      "payment_successful",
                      "payment_failed",
                      "subscription_created",
                      "subscription_cancelled",
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          disputeEvents: {
            $sum: {
              $cond: [
                {
                  $in: ["$eventType", ["dispute_created", "dispute_resolved"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: {
          [sortBy === "createdAt" ? "firstActivity" : sortBy]:
            sortOrder === "desc" ? -1 : 1,
        },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ];

    const users = await userActivityCollection.aggregate(pipeline).toArray();

    // Get total count for pagination
    const totalCountPipeline = [
      { $match: searchFilter },
      { $group: { _id: "$userId" } },
      { $count: "total" },
    ];

    const totalCountResult = await userActivityCollection
      .aggregate(totalCountPipeline)
      .toArray();
    const totalCount = totalCountResult[0]?.total || 0;

    // Format response
    const formattedUsers = users.map((user) => ({
      userId: user._id,
      lastActivity: user.lastActivity,
      firstActivity: user.firstActivity,
      totalActivities: user.totalActivities,
      uniqueIpAddresses: user.ipAddresses.length,
      uniqueUserAgents: user.userAgents.length,
      totalTokens: user.totalTokens,
      practiceAttempts: user.practiceAttempts,
      practiceCompletions: user.practiceCompletions,
      mockAttempts: user.mockAttempts,
      mockCompletions: user.mockCompletions,
      paymentEvents: user.paymentEvents,
      disputeEvents: user.disputeEvents,
      riskScore: calculateRiskScore(user),
      ipAddresses: user.ipAddresses.slice(0, 5), // Show only first 5 IPs
      userAgents: user.userAgents.slice(0, 3), // Show only first 3 user agents
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

function calculateRiskScore(user: any): number {
  let riskScore = 0;

  // High dispute events
  if (user.disputeEvents > 0) riskScore += 50;

  // Multiple IP addresses (potential shared account)
  if (user.uniqueIpAddresses > 3) riskScore += 20;
  if (user.uniqueIpAddresses > 10) riskScore += 30;

  // Multiple user agents (potential automation)
  if (user.uniqueUserAgents > 5) riskScore += 15;

  // High token usage without completion
  const completionRate =
    (user.practiceCompletions + user.mockCompletions) /
    (user.practiceAttempts + user.mockAttempts || 1);
  if (completionRate < 0.3 && user.totalTokens > 10000) riskScore += 25;

  // Payment events without corresponding activity
  if (user.paymentEvents > 0 && user.totalActivities < 10) riskScore += 20;

  return Math.min(riskScore, 100);
}
