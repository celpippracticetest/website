import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import mongoClient from "@/lib/mongodb";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { RefundRequestRepository } from "@/repositories/refund-request.repo";
import { refundLastPaymentAndCancelSubscriptions } from "@/lib/stripeLastPaymentSelfService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  trackingCode: z.string().trim().min(6).max(64),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { trackingCode } = parsed.data;

  try {
    const repo = new RefundRequestRepository(mongoClient);
    const refundReq = await repo.findByTrackingCodeForUser({
      userId,
      trackingCode,
    });

    if (!refundReq) {
      return NextResponse.json(
        { error: "Refund request not found for this account." },
        { status: 404 }
      );
    }

    if (refundReq.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "This request has already been processed. Use the tracking page to view its status.",
        },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);

    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No card billing profile found. Please wait for our team to review your request.",
        },
        { status: 422 }
      );
    }

    const result = await refundLastPaymentAndCancelSubscriptions({
      customerId,
      refundRequestId: refundReq.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    await repo.updateStatus({ id: refundReq.id, status: "refunded" });

    const now = new Date();
    const currentMeta = (user.publicMetadata || {}) as Record<string, unknown>;
    try {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...currentMeta,
          plan: "free",
          planCancelled: true,
          subscriptionCancelledAt: now.toISOString(),
        },
      });
    } catch (metaErr) {
      console.error("[refund-last-payment] Clerk metadata update failed", metaErr);
    }

    return NextResponse.json({
      success: true,
      refundId: result.refundId,
      refundedAmountDisplay: result.refundedAmountDisplay,
      canceledSubscriptionCount: result.canceledSubscriptionCount,
      message:
        result.canceledSubscriptionCount > 0
          ? `Your last payment (${result.refundedAmountDisplay}) has been refunded and your subscription was cancelled.`
          : `Your last payment (${result.refundedAmountDisplay}) has been refunded.`,
    });
  } catch (error) {
    console.error("[refund-last-payment]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or contact support." },
      { status: 500 }
    );
  }
}
