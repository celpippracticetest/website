import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";
import { z } from "zod";
import mongoClient from "@/lib/mongodb";
import { RefundRequestRepository } from "@/repositories/refund-request.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = [
  "pending",
  "done",
  "under_review",
  "approved",
  "rejected",
  "refunded",
] as const;

const RejectReasonSchema = z.enum([
  "outside_refund_window",
  "used_service_after_purchase",
  "duplicate_request",
  "insufficient_details",
  "other",
]);

const UpdateStatusSchema = z
  .object({
    requestId: z.string().trim().min(1),
    status: z.enum(["done", "rejected"]),
    rejectionReason: RejectReasonSchema.optional(),
    rejectionMessage: z.string().trim().min(3).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "rejectionReason is required when status is rejected",
      });
    }
  });

export async function GET(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.roles?.includes("admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );
    const status = (searchParams.get("status") || "all").toLowerCase();
    const statusFilter =
      status === "all"
        ? {}
        : { status: VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number]) ? status : "pending" };

    const db = client.db();
    const collection = db.collection("refundRequests");
    const skip = (page - 1) * limit;

    const [requests, totalCount] = await Promise.all([
      collection.find(statusFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(statusFilter),
    ]);

    // Fetch user activities for each request
    const userActivitiesCollection = db.collection("useractivities");
    const userIds = requests.map((req) => req.userId);

    // Get activity stats and last token usage for all users
    const userActivityData = await Promise.all(
      userIds.map(async (userId) => {
        const [activityCount, lastTokenUsage] = await Promise.all([
          // Count total activities
          userActivitiesCollection.countDocuments({ userId }),
          // Get last learning activity with tokens
          userActivitiesCollection
            .findOne(
              {
                userId,
                context: "learning",
                $or: [
                  { llmTokensPrompt: { $gt: 0 } },
                  { llmTokensCompletion: { $gt: 0 } },
                ],
              },
              { sort: { timestampUtc: -1 } }
            ),
        ]);

        return {
          userId,
          activityCount,
          lastTokenUsage: lastTokenUsage
            ? {
                timestamp: lastTokenUsage.timestampUtc,
                totalTokens:
                  (lastTokenUsage.llmTokensPrompt || 0) +
                  (lastTokenUsage.llmTokensCompletion || 0),
              }
            : null,
        };
      })
    );

    // Create a map for easy lookup
    const userActivityMap = new Map(
      userActivityData.map((data) => [data.userId, data])
    );

    return NextResponse.json({
      requests: requests.map((item) => {
        const activityData = userActivityMap.get(item.userId);
        return {
          ...item,
          _id: String(item._id),
          userActivityCount: activityData?.activityCount || 0,
          lastTokenUsage: activityData?.lastTokenUsage || null,
        };
      }),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching admin refund requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch refund requests" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.roles?.includes("admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const repo = new RefundRequestRepository(mongoClient);
    await repo.ensureIndexes();

    const updated = await repo.updateStatus({
      id: parsed.data.requestId,
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      rejectionMessage: parsed.data.rejectionMessage,
    });

    if (!updated) {
      return NextResponse.json({ error: "Refund request not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (error) {
    console.error("Error updating admin refund request:", error);
    return NextResponse.json(
      { error: "Failed to update refund request" },
      { status: 500 }
    );
  }
}
