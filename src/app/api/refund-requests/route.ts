import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { z } from "zod";
import documentsClient from "@/lib/appDocumentsClient";
import { RefundRequestWriteSchema } from "@/models/refund-request.model";
import { RefundRequestRepository } from "@/repositories/refund-request.repo";
import { getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TrackingQuerySchema = z.object({
  trackingCode: z.string().trim().min(6).max(64),
});

function buildTrackingCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RF-${ts}-${random}`;
}

function buildRefundRequestEmailHtml(params: {
  trackingCode: string;
  status: string;
  fullName: string;
  email: string;
  reason: string;
  details: string;
  createdAt: Date;
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2a3d;">
      <h2 style="margin: 0 0 12px;">New Refund Request Submitted</h2>
      <p style="margin: 0 0 12px;">A new refund request has been submitted on CELPIP Practice Test.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 700px;">
        <tr><td style="padding: 6px 0; font-weight: 600;">Tracking Code:</td><td style="padding: 6px 0;">${params.trackingCode}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Status:</td><td style="padding: 6px 0;">${params.status}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Full Name:</td><td style="padding: 6px 0;">${params.fullName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Email:</td><td style="padding: 6px 0;">${params.email}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Reason:</td><td style="padding: 6px 0;">${params.reason}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 600;">Submitted At:</td><td style="padding: 6px 0;">${params.createdAt.toISOString()}</td></tr>
      </table>
      <p style="margin: 16px 0 8px; font-weight: 600;">Details</p>
      <div style="white-space: pre-wrap; border: 1px solid #d7dfee; border-radius: 8px; padding: 12px;">${params.details}</div>
    </div>
  `;
}

async function generateUniqueTrackingCode(repo: RefundRequestRepository) {
  for (let i = 0; i < 8; i += 1) {
    const code = buildTrackingCode();
    const exists = await repo.existsByTrackingCode(code);
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique tracking code");
}

async function userHasCompletedCheckout(clerkUserId: string): Promise<boolean> {
  const filter = { userId: clerkUserId, status: "complete" as const };
  const inDefault = await documentsClient.db().collection("checkouts").findOne(filter);
  if (inDefault) return true;
  const inProd = await documentsClient.db("prod").collection("checkouts").findOne(filter);
  return Boolean(inProd);
}

/** Active/past subscribers: JWT says paid, or we have a completed checkout on file. */
async function assertRefundPortalAccess(
  userId: string | null,
  plan: string | undefined,
  purchaseDate: unknown
): Promise<NextResponse | null> {
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (hasPaidPracticeAccess(plan, purchaseDate)) {
    return null;
  }
  if (await userHasCompletedCheckout(userId)) {
    return null;
  }
  return NextResponse.json(
    {
      error:
        "Refund requests are for customers with an active or previous subscription. If you believe this is a mistake, contact support.",
    },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const plan = sessionClaims?.metadata?.plan as string | undefined;
    const purchaseDate = (sessionClaims?.metadata as { purchaseDate?: unknown } | undefined)
      ?.purchaseDate;
    const guard = await assertRefundPortalAccess(userId, plan, purchaseDate);
    if (guard) return guard;

    const body = await req.json();
    const parsedInput = RefundRequestWriteSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: "Invalid refund request data", details: parsedInput.error.issues },
        { status: 400 }
      );
    }

    const repo = new RefundRequestRepository(documentsClient);
    await repo.ensureIndexes();

    const trackingCode = await generateUniqueTrackingCode(repo);
    const created = await repo.createRefundRequest({
      userId: userId as string,
      trackingCode,
      input: parsedInput.data,
    });

    try {
      if (!getResendClient()) {
        console.warn("[refund-requests] RESEND_API_KEY not set; skipping admin email.");
      } else {
        await sendResendHtmlEmail({
          to: "accounts@celpippracticetest.com",
          subject: `New Refund Request - ${created.trackingCode}`,
          html: buildRefundRequestEmailHtml({
            trackingCode: created.trackingCode,
            status: created.status,
            fullName: created.fullName,
            email: created.email,
            reason: created.reason,
            details: created.details,
            createdAt: created.createdAt,
          }),
        });
      }
    } catch (emailError) {
      console.error("Refund request created, but email notification failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Refund request submitted successfully",
      request: {
        id: created.id,
        trackingCode: created.trackingCode,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to create refund request:", error);
    return NextResponse.json(
      { error: "Failed to submit refund request" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const plan = sessionClaims?.metadata?.plan as string | undefined;
    const purchaseDate = (sessionClaims?.metadata as { purchaseDate?: unknown } | undefined)
      ?.purchaseDate;
    const guard = await assertRefundPortalAccess(userId, plan, purchaseDate);
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const parsed = TrackingQuerySchema.safeParse({
      trackingCode: searchParams.get("trackingCode"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Valid trackingCode query is required" },
        { status: 400 }
      );
    }

    const repo = new RefundRequestRepository(documentsClient);
    const request = await repo.findByTrackingCodeForUser({
      userId: userId as string,
      trackingCode: parsed.data.trackingCode,
    });

    if (!request) {
      return NextResponse.json(
        { error: "Refund request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: {
        trackingCode: request.trackingCode,
        status: request.status,
        fullName: request.fullName,
        email: request.email,
        reason: request.reason,
        details: request.details,
        rejectionReason: request.rejectionReason,
        rejectionMessage: request.rejectionMessage,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to fetch refund request:", error);
    return NextResponse.json(
      { error: "Failed to fetch refund request" },
      { status: 500 }
    );
  }
}
