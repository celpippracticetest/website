import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

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
    const sortBy = searchParams.get("sortBy") || "lastActivity";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const subscriptionStatus = searchParams.get("subscriptionStatus");

    const db = client.db();
    const userActivityCollection = db.collection("useractivities");

    // Build Subscription Filter
    const subscriptionFilter = [];
    if (subscriptionStatus === "active") {
      subscriptionFilter.push({
        $match: { plan: { $in: ["premium", "pro", "enterprise"] } },
      });
    } else if (subscriptionStatus === "unsubscribed") {
      subscriptionFilter.push({
        $match: {
          plan: { $nin: ["premium", "pro", "enterprise"] },
          subscriptionHistory: { $elemMatch: { type: "subscription_created" } },
        },
      });
    } else if (subscriptionStatus === "never") {
      subscriptionFilter.push({
        $match: {
          plan: { $nin: ["premium", "pro", "enterprise"] },
          subscriptionHistory: {
            $not: { $elemMatch: { type: "subscription_created" } },
          },
        },
      });
    }

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
          subscriptionHistory: {
            $push: {
              $cond: [
                {
                  $in: [
                    "$eventType",
                    ["subscription_created", "subscription_cancelled"],
                  ],
                },
                { type: "$eventType", date: "$timestampUtc" },
                "$$REMOVE",
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
                purchaseAmount: { $ifNull: ["$publicMetadata.purchaseAmount", 0] },
                purchaseCurrency: { $ifNull: ["$publicMetadata.purchaseCurrency", "CAD"] },
                totalSpend: { $ifNull: ["$publicMetadata.totalSpend", 0] },
                // Try publicMetadata first, fallback to attribution.firstTouch
                utm_source: { 
                  $ifNull: [
                    "$publicMetadata.utm_source", 
                    { $ifNull: ["$attribution.firstTouch.source", null] }
                  ] 
                },
                utm_medium: { 
                  $ifNull: [
                    "$publicMetadata.utm_medium", 
                    { $ifNull: ["$attribution.firstTouch.medium", null] }
                  ] 
                },
                utm_campaign: { 
                  $ifNull: [
                    "$publicMetadata.utm_campaign", 
                    { $ifNull: ["$attribution.firstTouch.campaign", null] }
                  ] 
                },
                gclid: { 
                  $ifNull: [
                    "$publicMetadata.gclid", 
                    { $ifNull: ["$attribution.firstTouch.gclid", null] }
                  ] 
                },
                planCancelled: { $ifNull: ["$publicMetadata.planCancelled", false] },
                publicMetadataPurchaseDate: "$publicMetadata.purchaseDate",
                subscriptionStartDate: 1,
                subscriptionEndDate: 1,
                subscriptionDurationDays: 1,
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
          purchaseAmount: { $max: "$purchaseAmount" },
          purchaseCurrency: { $max: "$purchaseCurrency" },
          totalSpend: { $max: "$totalSpend" },
          utm_source: { $max: "$utm_source" },
          utm_medium: { $max: "$utm_medium" },
          utm_campaign: { $max: "$utm_campaign" },
          gclid: { $max: "$gclid" },
          planCancelled: { $max: "$planCancelled" },
          publicMetadataPurchaseDate: { $max: "$publicMetadataPurchaseDate" },
          subscriptionStartDate: { $max: "$subscriptionStartDate" },
          subscriptionEndDate: { $max: "$subscriptionEndDate" },
          subscriptionDurationDays: { $max: "$subscriptionDurationDays" },
          createdAt: { $max: "$createdAt" },
          // Activity Stats - Use $max to get the actual value (one doc has stats, the other has 0/null)
          // Using $sum could incorrectly add values if users collection has these fields
          lastActivity: { $max: "$lastActivity" },
          firstActivity: { $min: "$firstActivity" },
          totalActivities: { $sum: { $ifNull: ["$totalActivities", 0] } },
          totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
          practiceAttempts: { $max: { $ifNull: ["$practiceAttempts", 0] } },
          practiceCompletions: { $max: { $ifNull: ["$practiceCompletions", 0] } },
          mockAttempts: { $max: { $ifNull: ["$mockAttempts", 0] } },
          mockCompletions: { $max: { $ifNull: ["$mockCompletions", 0] } },
          paymentEvents: { $sum: { $ifNull: ["$paymentEvents", 0] } },
          disputeEvents: { $sum: { $ifNull: ["$disputeEvents", 0] } },
          // Arrays need to be merged
          ipAddresses: { $push: "$ipAddresses" },
          userAgents: { $push: "$userAgents" },
          subscriptionHistory: { $push: "$subscriptionHistory" },
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
          subscriptionHistory: {
            $reduce: {
              input: "$subscriptionHistory",
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
      ...subscriptionFilter,
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
    const formattedUsers = data.map((user: any) => {
      // Calculate subscription details
      const subHistory = (user.subscriptionHistory || []).sort(
        (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let subscriptionStatus = "never";
      let subscriptionDurationDays = 0;
      let subscriptionStartDate: Date | null = null;
      let subscriptionEndDate: Date | null = null;

      const isPremium =
        user.plan === "premium" || user.plan === "pro" || user.plan === "enterprise";
      const planCancelled = Boolean(user.planCancelled);

      const persistedStartDate = toDate(user.subscriptionStartDate);
      const persistedEndDate = toDate(user.subscriptionEndDate);
      const persistedDurationDays = Number(user.subscriptionDurationDays || 0);
      const purchaseDate = toDate(user.publicMetadataPurchaseDate);

      const latestStartEvent = [...subHistory]
        .reverse()
        .find((e: any) => e.type === "subscription_created");

      const latestStartDate =
        toDate(latestStartEvent?.date) || persistedStartDate || purchaseDate;

      const firstCancellationAfterLatestStart = latestStartDate
        ? subHistory.find(
            (e: any) =>
              e.type === "subscription_cancelled" &&
              new Date(e.date).getTime() > latestStartDate.getTime()
          )
        : null;

      if (isPremium) {
        subscriptionStatus = "active";
        if (latestStartDate) {
          subscriptionStartDate = latestStartDate;
          if (planCancelled && persistedDurationDays > 0) {
            // Frozen on the day cancellation was requested.
            subscriptionDurationDays = persistedDurationDays;
            subscriptionEndDate = persistedEndDate;
          } else {
            subscriptionDurationDays = diffDays(latestStartDate, new Date());
          }
        }
      } else {
        if (latestStartDate) {
          subscriptionStatus = "unsubscribed";
          subscriptionStartDate = latestStartDate;

          if (persistedDurationDays > 0 && persistedEndDate) {
            subscriptionDurationDays = persistedDurationDays;
            subscriptionEndDate = persistedEndDate;
          } else if (firstCancellationAfterLatestStart) {
            const cancellationDate = toDate(firstCancellationAfterLatestStart.date);
            if (cancellationDate) {
              subscriptionEndDate = cancellationDate;
              subscriptionDurationDays = diffDays(latestStartDate, cancellationDate);
            }
          } else {
            subscriptionDurationDays = diffDays(latestStartDate, new Date());
          }
        }
      }

      return {
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
      purchaseAmount: user.purchaseAmount || 0,
      purchaseCurrency: user.purchaseCurrency || "CAD",
      totalSpend: user.totalSpend || 0,
      utm_source: user.utm_source || null,
      utm_medium: user.utm_medium || null,
      utm_campaign: user.utm_campaign || null,
      gclid: user.gclid || null,
      subscriptionStatus,
      subscriptionDurationDays,
      subscriptionStartDate: subscriptionStartDate
        ? subscriptionStartDate.toISOString()
        : null,
      subscriptionEndDate: subscriptionEndDate ? subscriptionEndDate.toISOString() : null,
    }});

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
