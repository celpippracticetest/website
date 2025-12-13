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

    // Build search filter
    const searchMatch: Record<string, unknown> = {};
    if (search) {
      searchMatch.$or = [
        { oderId: { $regex: search, $options: "i" } },
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

    // Main pipeline: Start from users collection to get ALL users
    // Then lookup activity stats
    const pipeline = [
      // Start with all users from users collection
      {
        $project: {
          oderId: "$clerkUserId",
          email: "$email",
          plan: { $ifNull: ["$plan", "free"] },
          planType: { $ifNull: ["$planType", null] },
          userCreatedAt: "$createdAt",
        },
      },
      // Union with unique userIds from useractivities (to catch users without a profile)
      {
        $unionWith: {
          coll: "useractivities",
          pipeline: [
            {
              $group: {
                _id: "$userId",
                email: { $last: "$email" },
              },
            },
            {
              $project: {
                oderId: "$_id",
                email: "$email",
                plan: { $literal: "free" },
                planType: { $literal: null },
                userCreatedAt: { $literal: null },
              },
            },
          ],
        },
      },
      // Group to deduplicate (same user might appear in both collections)
      {
        $group: {
          _id: "$oderId",
          email: { $first: "$email" },
          plan: { $first: "$plan" },
          planType: { $first: "$planType" },
          userCreatedAt: { $first: "$userCreatedAt" },
        },
      },
      // Filter out null/undefined userIds
      {
        $match: {
          _id: { $ne: null, $exists: true },
        },
      },
      // Apply search filter if provided
      ...(search
        ? [
          {
            $match: {
              $or: [
                { _id: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
        : []),
      // Lookup activity stats for each user
      {
        $lookup: {
          from: "useractivities",
          let: { oderId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$oderId"] } } },
            {
              $group: {
                _id: null,
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
      // Unwind activity stats (will be empty array if no activities)
      {
        $addFields: {
          stats: { $arrayElemAt: ["$activityStats", 0] },
        },
      },
      // Flatten stats into main document
      {
        $addFields: {
          lastActivity: { $ifNull: ["$stats.lastActivity", null] },
          firstActivity: {
            $ifNull: ["$stats.firstActivity", "$userCreatedAt"],
          },
          totalActivities: { $ifNull: ["$stats.totalActivities", 0] },
          ipAddresses: { $ifNull: ["$stats.ipAddresses", []] },
          userAgents: { $ifNull: ["$stats.userAgents", []] },
          totalTokens: { $ifNull: ["$stats.totalTokens", 0] },
          practiceAttempts: { $ifNull: ["$stats.practiceAttempts", 0] },
          practiceCompletions: { $ifNull: ["$stats.practiceCompletions", 0] },
          mockAttempts: { $ifNull: ["$stats.mockAttempts", 0] },
          mockCompletions: { $ifNull: ["$stats.mockCompletions", 0] },
          paymentEvents: { $ifNull: ["$stats.paymentEvents", 0] },
          disputeEvents: { $ifNull: ["$stats.disputeEvents", 0] },
        },
      },
      // Remove temporary fields
      {
        $project: {
          activityStats: 0,
          stats: 0,
          userCreatedAt: 0,
        },
      },
      // Sort
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
    const users = await usersCollection
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    // Get total count - count unique users from both collections
    const countPipeline = [
      {
        $project: {
          oderId: "$clerkUserId",
        },
      },
      {
        $unionWith: {
          coll: "useractivities",
          pipeline: [
            { $group: { _id: "$userId" } },
            { $project: { oderId: "$_id" } },
          ],
        },
      },
      {
        $group: {
          _id: "$oderId",
        },
      },
      {
        $match: {
          _id: { $ne: null, $exists: true },
        },
      },
      ...(search
        ? [
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "clerkUserId",
              as: "userInfo",
            },
          },
          {
            $lookup: {
              from: "useractivities",
              localField: "_id",
              foreignField: "userId",
              pipeline: [{ $limit: 1 }],
              as: "activityInfo",
            },
          },
          {
            $addFields: {
              email: {
                $ifNull: [
                  { $arrayElemAt: ["$userInfo.email", 0] },
                  { $arrayElemAt: ["$activityInfo.email", 0] },
                ],
              },
            },
          },
          {
            $match: {
              $or: [
                { _id: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
              ],
            },
          },
        ]
        : []),
      { $count: "total" },
    ];

    const totalCountResult = await usersCollection
      .aggregate(countPipeline, { allowDiskUse: true })
      .toArray();
    const totalCount = totalCountResult[0]?.total || 0;

    // Format response
    const formattedUsers = users.map((user) => {
      const uniqueIpAddresses = (user.ipAddresses || []).filter(Boolean).length;
      const uniqueUserAgents = (user.userAgents || []).filter(Boolean).length;

      return {
        userId: user._id,
        email: user.email ?? null,
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
