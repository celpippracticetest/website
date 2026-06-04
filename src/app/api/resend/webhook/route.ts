import { NextRequest, NextResponse } from "next/server";
import { verifyResendWebhook } from "@/lib/email/resend-webhook";
import {
  NURTURE_EMAIL_KIND,
  recordNurtureEmailEvent,
  type NurtureEmailEventType,
} from "@/lib/nurture-email/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nurtureEventType(type: string): NurtureEmailEventType | null {
  if (type === "email.opened") return "opened";
  if (type === "email.clicked") return "clicked";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const event = verifyResendWebhook(payload, {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    });

    const eventType = nurtureEventType(event.type);
    if (!eventType) {
      return NextResponse.json({ ok: true, ignored: true, type: event.type });
    }

    const tags = event.data.tags ?? {};
    if (tags.email_kind !== NURTURE_EMAIL_KIND) {
      return NextResponse.json({ ok: true, ignored: true, reason: "not_nurture" });
    }

    const resendMessageId = event.data.email_id?.trim();
    if (!resendMessageId) {
      return NextResponse.json({ ok: false, error: "missing email_id" }, { status: 400 });
    }

    const svixId = request.headers.get("svix-id")?.trim();
    if (!svixId) {
      return NextResponse.json({ ok: false, error: "missing svix-id" }, { status: 400 });
    }

    const occurredAt = new Date(event.created_at);
    const result = await recordNurtureEmailEvent({
      svixId,
      eventType,
      resendMessageId,
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
      tags,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    console.error("[resend/webhook] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
