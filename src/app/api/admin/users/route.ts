import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const currentUserData = await currentUser();
    if (!currentUserData)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const authenticate = await auth();
    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "totalActivities";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const db = client.db();
    const userActivityCollection = db.collection("useractivities");

    // Build Search Filter
    // Note: We apply search at the END of the pipeline to ensure we filter the merged result
    const searchRegex = search ? { $regex: search, $options: "i" } : null;
    const searchMatch = searchRegex
      ? {
        $match: {
          $or: [
            { _id: searchRegex }, // userId
            { email: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
            { "ipAddresses": searchRegex },
          ],
        },
      }
      : { $match: {} };

    // --- Aggregation Pipeline ---
    const pipeline = [
      // 1. Aggregate Activity Stats (Group by userId)
      // This gets us a list of UNIQUE active users with their stats
      {
        $group: {
          _id: "$userId",
          email: { $last: "$email" }, // Use latest email from activity
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
      // 2. Union with Users Collection
      // This brings in ALL users, including those with 0 activity
      {
        $unionWith: {
          coll: "users",
          pipeline: [
            {
              $project: {
                _id: "$clerkUserId", // Map clerkUserId to _id to match activity grouping
                email: 1,
                firstName: 1,
                lastName: 1,
                plan: 1,
                planType: 1,
                createdAt: 1,
                // Mark these as from 'users' collection so we can prioritize profile data
                isUserProfile: { $literal: true },
              },
            },
          ],
        },
      },
      // 3. Group and Merge (Combine Activity + Profile)
      {
        $group: {
          _id: "$_id", // Group by User ID
          email: { $last: "$email" }, // Prefer email from whichever doc came last (usually profile if sorted, but here we just take one)
          // Profile Data
          plan: { $max: "$plan" },
          planType: { $max: "$planType" },
          createdAt: { $max: "$createdAt" },
          // Activity Stats (Summing works because one doc has stats, the other has 0/null)
          lastActivity: { $max: "$lastActivity" },
          firstActivity: { $min: "$firstActivity" },
          totalActivities: { $sum: "$totalActivities" },
          totalTokens: { $sum: "$totalTokens" },
          practiceAttempts: { $sum: "$practiceAttempts" },
          practiceCompletions: { $sum: "$practiceCompletions" },
          mockAttempts: { $sum: "$mockAttempts" },
          mockCompletions: { $sum: "$mockCompletions" },
          paymentEvents: { $sum: "$paymentEvents" },
          disputeEvents: { $sum: "$disputeEvents" },
          // Arrays need to be merged
          ipAddresses: { $push: "$ipAddresses" },
          userAgents: { $push: "$userAgents" },
        },
      },
      // 4. Clean up Arrays (Flatten)
      {
        $addFields: {
          ipAddresses: {
            $reduce: {
              input: "$ipAddresses",
              initialValue: [],
              in: { $setUnion: ["$$value", { $ifNull: ["$$this", []] }] },
            },
          },
          userAgents: {
            $reduce: {
              input: "$userAgents",
              initialValue: [],
              in: { $setUnion: ["$$value", { $ifNull: ["$$this", []] }] },
            },
          },
          // Ensure defaults
          plan: { $ifNull: ["$plan", "free"] },
          createdAt: { $ifNull: ["$createdAt", "$firstActivity"] }, // Fallback to first activity if no profile
        },
      },
      // 5. Apply Search Filter (on the merged result)
      searchMatch,
      // 6. Sort
      {
        $sort: {
          [sortBy]: sortOrder === "desc" ? -1 : 1,
          _id: 1, // Secondary sort for stability
        } as Record<string, 1 | -1>,
      },
      // 7. Pagination
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
    ];

    // Execute Aggregation
    const result = await userActivityCollection
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();

    const data = result[0].data || [];
    const totalCount = result[0].metadata[0]?.total || 0;

    // Format Response
    const formattedUsers = data.map((user: any) => ({
      userId: user._id,
      email: user.email ?? null,
      lastActivity: user.lastActivity || null,
      firstActivity: user.firstActivity || user.createdAt || null,
      totalActivities: user.totalActivities || 0,
      uniqueIpAddresses: (user.ipAddresses || []).length,
      uniqueUserAgents: (user.userAgents || []).length,
      totalTokens: user.totalTokens || 0,
      practiceAttempts: user.practiceAttempts || 0,
      practiceCompletions: user.practiceCompletions || 0,
      mockAttempts: user.mockAttempts || 0,
      mockCompletions: user.mockCompletions || 0,
      paymentEvents: user.paymentEvents || 0,
      disputeEvents: user.disputeEvents || 0,
      riskScore: calculateRiskScoreGrouped(user),
      ipAddresses: (user.ipAddresses || []).slice(0, 5),
      userAgents: (user.userAgents || []).slice(0, 3),
      plan: user.plan,
      planType: user.planType || null,
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
