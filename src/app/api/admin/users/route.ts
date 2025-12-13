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
    const usersCollection = db.collection("users");

    // Build search filter for users collection
    const searchFilter: any = {};
    if (search) {
      searchFilter.$or = [
        { clerkUserId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }

    // Aggregation pipeline starting from users collection
    const pipeline = [
      { $match: searchFilter },
      {
        $lookup: {
          from: "useractivities",
          let: { userId: "$clerkUserId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
            {
              $group: {
                _id: null,
                lastActivity: { $max: "$timestampUtc" },
                firstActivity: { $min: "$timestampUtc" },
                totalActivities: { $sum: 1 },
                ipAddresses: { $addToSet: "$ipAddress" },
                userAgents: { $addToSet: "$userAgent" },
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
                    $cond: [
                      { $eq: ["$eventType", "mock_attempt_started"] },
                      1,
                      0,
                    ],
                  },
                },
                mockCompletions: {
                  $sum: {
                    $cond: [
                      { $eq: ["$eventType", "mock_attempt_completed"] },
                      1,
                      0,
                    ],
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
                        $in: [
                          "$eventType",
                          ["dispute_created", "dispute_resolved"],
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "activityStats",
        },
      },
      {
        $unwind: {
          path: "$activityStats",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          lastActivity: { $ifNull: ["$activityStats.lastActivity", null] },
          firstActivity: { $ifNull: ["$activityStats.firstActivity", null] },
          totalActivities: { $ifNull: ["$activityStats.totalActivities", 0] },
          ipAddresses: { $ifNull: ["$activityStats.ipAddresses", []] },
          userAgents: { $ifNull: ["$activityStats.userAgents", []] },
          totalTokens: { $ifNull: ["$activityStats.totalTokens", 0] },
          practiceAttempts: { $ifNull: ["$activityStats.practiceAttempts", 0] },
          practiceCompletions: {
            $ifNull: ["$activityStats.practiceCompletions", 0],
          },
          mockAttempts: { $ifNull: ["$activityStats.mockAttempts", 0] },
          mockCompletions: { $ifNull: ["$activityStats.mockCompletions", 0] },
          paymentEvents: { $ifNull: ["$activityStats.paymentEvents", 0] },
          disputeEvents: { $ifNull: ["$activityStats.disputeEvents", 0] },
        },
      },
      // Secondary search filter for fields derived from activities (IP, User Agent)
      ...(search
        ? [
          {
            $match: {
              $or: [
                { ipAddresses: { $regex: search, $options: "i" } },
                { userAgents: { $regex: search, $options: "i" } },
                // Re-include user fields to ensure OR logic works across all fields
                { clerkUserId: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
        : []),
      {
        $sort: {
          [sortBy === "createdAt" ? "createdAt" : sortBy]:
            sortOrder === "desc" ? -1 : 1,
        },
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const users = await usersCollection
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    // Get total count for pagination
    // Note: This count might be slightly off if searching by IP/UA, but it's much faster than running the full pipeline again
    let totalCount = 0;
    if (search) {
      // If searching, we need to run a count pipeline that approximates the match
      // For simplicity and performance, we'll just count matches in users collection
      // If searching by IP/UA, the count might be lower than actual results, but that's an acceptable trade-off
      totalCount = await usersCollection.countDocuments(searchFilter);
    } else {
      totalCount = await usersCollection.countDocuments();
    }

    // Format response
    const formattedUsers = users.map((user) => {
      const uniqueIpAddresses = user.ipAddresses?.length || 0;
      const uniqueUserAgents = user.userAgents?.length || 0;

      return {
        userId: user.clerkUserId || user._id.toString(),
        email: user.email ?? null,
        lastActivity: user.lastActivity,
        firstActivity: user.firstActivity || user.createdAt, // Fallback to createdAt if no activity
        totalActivities: user.totalActivities,
        uniqueIpAddresses,
        uniqueUserAgents,
        totalTokens: user.totalTokens,
        practiceAttempts: user.practiceAttempts,
        practiceCompletions: user.practiceCompletions,
        mockAttempts: user.mockAttempts,
        mockCompletions: user.mockCompletions,
        paymentEvents: user.paymentEvents,
        disputeEvents: user.disputeEvents,
        riskScore: calculateRiskScoreGrouped(user),
        ipAddresses: user.ipAddresses?.slice(0, 5) || [],
        userAgents: user.userAgents?.slice(0, 3) || [],
        plan: user.plan || "free",
        planType: user.planType || null,
      };
    });

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

function calculateRiskScoreGrouped(user: any): number {
  let riskScore = 0;

  const uniqueIpAddresses = user.ipAddresses?.length ?? 0;
  const uniqueUserAgents = user.userAgents?.length ?? 0;

  // High dispute events
  if (user.disputeEvents > 0) riskScore += 50;

  // Multiple IP addresses (potential shared account)
  if (uniqueIpAddresses > 10) riskScore += 30;
  else if (uniqueIpAddresses > 3) riskScore += 20;

  // Multiple user agents (potential automation)
  if (uniqueUserAgents > 5) riskScore += 15;

  // High token usage without completion
  const attempts = (user.practiceAttempts || 0) + (user.mockAttempts || 0);
  const completions =
    (user.practiceCompletions || 0) + (user.mockCompletions || 0);
  const completionRate = attempts ? completions / attempts : 1;
  if (completionRate < 0.3 && (user.totalTokens || 0) > 10000) riskScore += 25;

  // Payment events without corresponding activity
  if ((user.paymentEvents || 0) > 0 && (user.totalActivities || 0) < 10)
    riskScore += 20;

  return Math.min(riskScore, 100);
}
