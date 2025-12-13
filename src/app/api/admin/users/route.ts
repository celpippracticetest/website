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
    const searchFilter: Record<string, unknown> = {};
    if (search) {
      searchFilter.$or = [
        { userId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
        { userAgent: { $regex: search, $options: "i" } },
      ];
    }

    // Get unique users with their activity stats
    // NOTE: Removed the expensive $sort before $group to avoid memory limit errors
    const pipeline = [
      { $match: searchFilter },
      // Group by userId FIRST (before any sort to avoid memory issues)
      {
        $group: {
          _id: "$userId",
          email: { $last: "$email" },
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
      // Lookup user details from users collection
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "clerkUserId",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          plan: { $ifNull: ["$userDetails.plan", "free"] },
          planType: { $ifNull: ["$userDetails.planType", null] },
        },
      },
      // Sort AFTER grouping (much smaller dataset = no memory issues)
      {
        $sort: {
          [sortBy === "createdAt" ? "firstActivity" : sortBy]:
            sortOrder === "desc" ? -1 : 1,
        } as Record<string, 1 | -1>,
      },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    // Use allowDiskUse to handle large datasets
    const users = await userActivityCollection
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    // Get total count for pagination
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
      const uniqueIpAddresses = user.ipAddresses.length;
      const uniqueUserAgents = user.userAgents.length;

      return {
        userId: user._id,
        email: user.email ?? null,
        lastActivity: user.lastActivity,
        firstActivity: user.firstActivity,
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
        ipAddresses: user.ipAddresses.slice(0, 5),
        userAgents: user.userAgents.slice(0, 3),
        plan: user.plan,
        planType: user.planType,
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

  const uniqueIpAddresses =
    ((user.ipAddresses as string[]) || []).length ?? 0;
  const uniqueUserAgents =
    ((user.userAgents as string[]) || []).length ?? 0;

  // High dispute events
  if (((user.disputeEvents as number) || 0) > 0) riskScore += 50;

  // Multiple IP addresses (potential shared account)
  if (uniqueIpAddresses > 10) riskScore += 30;
  else if (uniqueIpAddresses > 3) riskScore += 20;

  // Multiple user agents (potential automation)
  if (uniqueUserAgents > 5) riskScore += 15;

  // High token usage without completion
  const attempts =
    ((user.practiceAttempts as number) || 0) +
    ((user.mockAttempts as number) || 0);
  const completions =
    ((user.practiceCompletions as number) || 0) +
    ((user.mockCompletions as number) || 0);
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

