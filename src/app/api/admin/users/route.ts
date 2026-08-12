import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import client from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";
import {
  listAdminUsersFromUserProfiles,
  listAdminUsersFromUsersDocuments,
  normalizeAdminUsersPageLimit,
  userProfilesTableExists,
} from "@/lib/admin/adminUsersDataSource";

export const maxDuration = 120;

const ADMIN_USERS_SORT_FIELDS = new Set([
  "lastActivity",
  "createdAt",
  "totalTokens",
  "totalActivities",
  "riskScore",
  "plan",
  "totalSpend",
]);

function normalizeAdminSortBy(raw: string | null): string {
  const v = (raw || "lastActivity").trim();
  return ADMIN_USERS_SORT_FIELDS.has(v) ? v : "lastActivity";
}

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
      sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = normalizeAdminUsersPageLimit(searchParams.get("limit"));
    const sortBy = normalizeAdminSortBy(searchParams.get("sortBy"));
    const sortOrderRaw = (searchParams.get("sortOrder") || "desc").toLowerCase();
    const sortOrder: "asc" | "desc" =
      sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : "desc";
    const subscriptionStatus = searchParams.get("subscriptionStatus") || "all";

    try {
      const sql = getSql();
      const hasProfiles = await userProfilesTableExists(sql);
      const { rows: lightweightRows, totalCount } = hasProfiles
        ? await listAdminUsersFromUserProfiles(sql, {
            search: search || "",
            page,
            limit,
            sortBy,
            sortOrder,
            subscriptionStatus,
          })
        : await listAdminUsersFromUsersDocuments(sql, {
            search: search || "",
            page,
            limit,
            sortBy,
            sortOrder,
            subscriptionStatus,
          });

      const formattedUsers = lightweightRows.map((user: any) =>
        formatAdminUserResponse(user)
      );

      return NextResponse.json({
        users: formattedUsers,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        listMode: hasProfiles ? "auth_and_profiles_sql" : "users_documents_sql",
      });
    } catch (e) {
      console.warn(
        "[admin/users] Supabase/SQL paginated list unavailable; falling back to in-process aggregate (loads all activity docs):",
        e instanceof Error ? e.message : e
      );
    }

    const db = client.db();
    const userActivityCollection = db.collection("useractivities");

    // Build Subscription Filter
    const subscriptionFilter = [];
    if (
      subscriptionStatus === "active" ||
      subscriptionStatus === "stripe_active" ||
      subscriptionStatus === "plans"
    ) {
      // Live Stripe matching is handled on the SQL path; Mongo fallback keeps
      // app-paid entitlement filter as a best-effort approximation.
      subscriptionFilter.push({
        $match: {
          plan: { $in: ["plus", "premium", "pro", "enterprise"] },
          planCancelled: { $ne: true },
        },
      });
    } else if (subscriptionStatus === "app_paid") {
      subscriptionFilter.push({
        $match: {
          plan: { $in: ["plus", "premium", "pro", "enterprise"] },
          planCancelled: { $ne: true },
        },
      });
    } else if (
      subscriptionStatus === "never" ||
      subscriptionStatus === "free"
    ) {
      subscriptionFilter.push({
        $match: {
          plan: { $nin: ["plus", "premium", "pro", "enterprise"] },
          planCancelled: { $ne: true },
          subscriptionHistory: {
            $not: { $elemMatch: { type: "subscription_created" } },
          },
        },
      });
    } else if (
      subscriptionStatus === "canceled" ||
      subscriptionStatus === "cancelled" ||
      subscriptionStatus === "unsubscribed"
    ) {
      subscriptionFilter.push({
        $match: {
          $or: [
            {
              plan: { $in: ["plus", "premium", "pro", "enterprise"] },
              planCancelled: true,
            },
            {
              plan: { $nin: ["plus", "premium", "pro", "enterprise"] },
              $or: [
                {
                  subscriptionHistory: {
                    $elemMatch: { type: "subscription_created" },
                  },
                },
                { planCancelled: true },
                { totalSpend: { $gt: 0 } },
              ],
            },
          ],
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
          lastActivity: {
            $max: {
              $cond: [
                {
                  $in: [
                    "$eventType",
                    [
                      "practice_attempt_started",
                      "practice_attempt_completed",
                      "mock_attempt_started",
                      "mock_attempt_completed",
                      "login",
                    ],
                  ],
                },
                "$timestampUtc",
                null,
              ],
            },
          },
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
                // Canonical id for $group: must match `useractivities.userId` (Supabase UUID, legacy Clerk id, or JWT sub).
                _id: {
                  $let: {
                    vars: {
                      orderedIds: {
                        $filter: {
                          input: ["$supabaseUserId", "$clerkUserId", "$sub"],
                          as: "uid",
                          cond: {
                            $and: [
                              { $eq: [{ $type: "$$uid" }, "string"] },
                              { $gt: [{ $strLenCP: "$$uid" }, 0] },
                            ],
                          },
                        },
                      },
                    },
                    in: { $arrayElemAt: ["$$orderedIds", 0] },
                  },
                },
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
                    { $ifNull: ["$attribution.firstTouch.source", null] },
                  ],
                },
                utm_medium: {
                  $ifNull: [
                    "$publicMetadata.utm_medium",
                    { $ifNull: ["$attribution.firstTouch.medium", null] },
                  ],
                },
                utm_campaign: {
                  $ifNull: [
                    "$publicMetadata.utm_campaign",
                    { $ifNull: ["$attribution.firstTouch.campaign", null] },
                  ],
                },
                gclid: {
                  $ifNull: [
                    "$publicMetadata.gclid",
                    { $ifNull: ["$attribution.firstTouch.gclid", null] },
                  ],
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
            { $match: { _id: { $nin: [null, ""] } } },
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
              in: {
                $setUnion: [
                  "$$value",
                  { $cond: [{ $isArray: "$$this" }, "$$this", []] },
                ],
              },
            },
          },
          userAgents: {
            $reduce: {
              input: "$userAgents",
              initialValue: [],
              in: {
                $setUnion: [
                  "$$value",
                  { $cond: [{ $isArray: "$$this" }, "$$this", []] },
                ],
              },
            },
          },
          subscriptionHistory: {
            $reduce: {
              input: "$subscriptionHistory",
              initialValue: [],
              in: {
                $setUnion: [
                  "$$value",
                  { $cond: [{ $isArray: "$$this" }, "$$this", []] },
                ],
              },
            },
          },
          // Ensure defaults
          plan: { $ifNull: ["$plan", "free"] },
          createdAt: { $ifNull: ["$createdAt", "$firstActivity"] }, // Fallback to first activity if no profile
        },
      },
      {
        $addFields: {
          uniqueIpAddressesCount: { $size: { $ifNull: ["$ipAddresses", []] } },
          uniqueUserAgentsCount: { $size: { $ifNull: ["$userAgents", []] } },
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

    const facet = result[0] as {
      data?: unknown[];
      metadata?: Array<{ total?: number }>;
    };
    const data = facet.data || [];
    const totalCount = facet.metadata?.[0]?.total || 0;

    const formattedUsers = data.map((user: any) => formatAdminUserResponse(user));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      listMode: "activity_aggregate",
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch users",
        detail:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}

function formatAdminUserResponse(user: Record<string, any>) {
  const subHistory = (user.subscriptionHistory || [])
    .filter((e: unknown) => e && typeof e === "object" && "date" in (e as object))
    .sort(
      (a: any, b: any) =>
        new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime()
    );

  let subscriptionStatusOut = "never";
  let subscriptionDurationDays = 0;
  let subscriptionStartDate: Date | null = null;
  let subscriptionEndDate: Date | null = null;

  const planNormalized = String(user.plan || "").trim().toLowerCase();
  const isPremium =
    planNormalized === "plus" ||
    planNormalized === "premium" ||
    planNormalized === "pro" ||
    planNormalized === "enterprise";
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
          new Date(String(e.date)).getTime() > latestStartDate.getTime()
      )
    : null;

  if (user.stripeSubscriptionActive) {
    subscriptionStatusOut = planCancelled && isPremium ? "canceling" : "active";
    if (latestStartDate) {
      subscriptionStartDate = latestStartDate;
      subscriptionDurationDays = diffDays(latestStartDate, new Date());
    }
    if (planCancelled && !subscriptionEndDate) {
      subscriptionEndDate =
        toDate(user.planExpiresAt) || toDate(user.publicMetadataPlanExpiresAt);
    }
  } else if (isPremium) {
    subscriptionStatusOut = planCancelled ? "canceling" : "active";
    if (latestStartDate) {
      subscriptionStartDate = latestStartDate;
      if (planCancelled && persistedDurationDays > 0) {
        subscriptionDurationDays = persistedDurationDays;
        subscriptionEndDate = persistedEndDate;
      } else {
        subscriptionDurationDays = diffDays(latestStartDate, new Date());
      }
    }
    if (planCancelled && !subscriptionEndDate) {
      subscriptionEndDate =
        toDate(user.planExpiresAt) || toDate(user.publicMetadataPlanExpiresAt);
    }
  } else {
    if (latestStartDate || purchaseDate || Number(user.totalSpend || 0) > 0) {
      subscriptionStatusOut = "unsubscribed";
      subscriptionStartDate = latestStartDate || purchaseDate;

      if (persistedDurationDays > 0 && persistedEndDate) {
        subscriptionDurationDays = persistedDurationDays;
        subscriptionEndDate = persistedEndDate;
      } else if (firstCancellationAfterLatestStart) {
        const cancellationDate = toDate(firstCancellationAfterLatestStart.date);
        if (cancellationDate && subscriptionStartDate) {
          subscriptionEndDate = cancellationDate;
          subscriptionDurationDays = diffDays(
            subscriptionStartDate,
            cancellationDate
          );
        }
      } else if (subscriptionStartDate) {
        subscriptionDurationDays = diffDays(subscriptionStartDate, new Date());
      }
    }
  }

  return {
    userId: user._id,
    email: user.email ?? null,
    lastActivity: user.lastActivity || null,
    firstActivity: user.firstActivity || user.createdAt || null,
    createdAt: user.createdAt || user.firstActivity || null,
    totalActivities: user.totalActivities || 0,
    uniqueIpAddresses: user.uniqueIpAddressesCount || 0,
    uniqueUserAgents: user.uniqueUserAgentsCount || 0,
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
    planCancelled,
    planExpiresAt: subscriptionEndDate
      ? subscriptionEndDate.toISOString()
      : toDate(user.planExpiresAt)?.toISOString() ||
        toDate(user.publicMetadataPlanExpiresAt)?.toISOString() ||
        null,
    purchaseAmount: user.purchaseAmount || 0,
    purchaseCurrency: user.purchaseCurrency || "CAD",
    totalSpend: user.totalSpend || 0,
    utm_source: user.utm_source || null,
    utm_medium: user.utm_medium || null,
    utm_campaign: user.utm_campaign || null,
    gclid: user.gclid || null,
    subscriptionStatus: subscriptionStatusOut,
    stripeSubscriptionActive: Boolean(user.stripeSubscriptionActive),
    subscriptionDurationDays,
    subscriptionStartDate: subscriptionStartDate
      ? subscriptionStartDate.toISOString()
      : null,
    purchaseDate: purchaseDate ? purchaseDate.toISOString() : null,
    subscriptionEndDate: subscriptionEndDate ? subscriptionEndDate.toISOString() : null,
  };
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
