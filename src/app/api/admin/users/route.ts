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

    // Build search filter for useractivities
    const searchFilter: Record<string, unknown> = {};
    if (search) {
      searchFilter.$or = [
        { userId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Determine sort field
    const getSortField = (field: string): string => {
      switch (field) {
        case "createdAt":
          return "firstActivity";
        case "lastActivity":
          return "lastActivity";
        case "firstActivity":
          return "firstActivity";
        case "totalActivities":
          return "totalActivities";
        default:
          return "firstActivity";
      }
    };

    // Main pipeline: Start from useractivities (where activity data is guaranteed)
    // Then lookup user details from users collection
    const pipeline = [
      // Match search filter first (reduces data before grouping)
      { $match: searchFilter },
      // Group by userId to aggregate all activity statistics
      {
        $group: {
          _id: "$userId",
          email: { $last: "$email" },
          lastActivity: { $max: "$timestampUtc" },
          firstActivity: { $min: "$timestampUtc" },
          totalActivities: { $sum: 1 },
          ipAddresses: { $addToSet: "$ipAddress" },
          userAgents: { $addToSet: "$userAgent" },
          totalTokens: {
            $sum: {
              $add: [
                { $ifNull: ["$llmTokensPrompt", 0] },
                { $ifNull: ["$llmTokensCompletion", 0] },
              ],
            },
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
                  $in: ["$eventType", ["dispute_created", "dispute_resolved"]],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      // Lookup user details from users collection
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "clerkUserId",
          as: "userDetails",
        },
      },
      // Unwind userDetails (preserveNullAndEmptyArrays to keep users without profile)
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add plan fields from user details
      {
        $addFields: {
          plan: { $ifNull: ["$userDetails.plan", "free"] },
          planType: { $ifNull: ["$userDetails.planType", null] },
          // Use email from users collection if available, otherwise from activity
          finalEmail: { $ifNull: ["$userDetails.email", "$email"] },
        },
      },
      // Sort AFTER grouping (much more memory efficient!)
      {
        $sort: {
          [getSortField(sortBy)]: sortOrder === "desc" ? -1 : 1,
        } as Record<string, 1 | -1>,
      },
      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    // Use allowDiskUse to handle large datasets without memory limit errors
    const users = await userActivityCollection
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    // Get total count for pagination (count unique userIds)
    const totalCountPipeline = [
      { $match: searchFilter },
      { $group: { _id: "$userId" } },
      { $count: "total" },
    ];

    const totalCountResult = await userActivityCollection
      .aggregate(totalCountPipeline, { allowDiskUse: true })
      .toArray();
    const totalCount = totalCountResult[0]?.total || 0;

    // Format response
    const formattedUsers = users.map((user) => {
      const uniqueIpAddresses = (user.ipAddresses || []).filter(Boolean).length;
      const uniqueUserAgents = (user.userAgents || []).filter(Boolean).length;

      return {
        userId: user._id,
        email: user.finalEmail ?? user.email ?? null,
        lastActivity: user.lastActivity || null,
        firstActivity: user.firstActivity || null,
        totalActivities: user.totalActivities || 0,
        uniqueIpAddresses,
        uniqueUserAgents,
        totalTokens: user.totalTokens || 0,
        practiceAttempts: user.practiceAttempts || 0,
        practiceCompletions: user.practiceCompletions || 0,
        mockAttempts: user.mockAttempts || 0,
        mockCompletions: user.mockCompletions || 0,
        paymentEvents: user.paymentEvents || 0,
        disputeEvents: user.disputeEvents || 0,
        riskScore: calculateRiskScoreGrouped(user),
        ipAddresses: (user.ipAddresses || []).filter(Boolean).slice(0, 5),
        userAgents: (user.userAgents || []).filter(Boolean).slice(0, 3),
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

function calculateRiskScoreGrouped(user: Record<string, unknown>): number {
  let riskScore = 0;

  const ipAddresses = (user.ipAddresses as string[] | undefined) || [];
  const userAgents = (user.userAgents as string[] | undefined) || [];
  const uniqueIpAddresses = ipAddresses.filter(Boolean).length;
  const uniqueUserAgents = userAgents.filter(Boolean).length;

  // High dispute events
  if (((user.disputeEvents as number) || 0) > 0) riskScore += 50;

  // Multiple IP addresses (potential shared account)
  if (uniqueIpAddresses > 10) riskScore += 30;
  else if (uniqueIpAddresses > 3) riskScore += 20;

  // Multiple user agents (potential automation)
  if (uniqueUserAgents > 5) riskScore += 15;

  // High token usage without completion
  const attempts =
    ((user.practiceAttempts as number) || 0) + ((user.mockAttempts as number) || 0);
  const completions =
    ((user.practiceCompletions as number) || 0) + ((user.mockCompletions as number) || 0);
  const completionRate = attempts ? completions / attempts : 1;
  if (completionRate < 0.3 && ((user.totalTokens as number) || 0) > 10000)
    riskScore += 25;

  // Payment events without corresponding activity
  if (
    ((user.paymentEvents as number) || 0) > 0 &&
    ((user.totalActivities as number) || 0) < 10
  )
    riskScore += 20;

  return Math.min(riskScore, 100);
}
