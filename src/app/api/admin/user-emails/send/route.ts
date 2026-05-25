import { ensureAdminApi } from "@/lib/auth/ensure-admin-api";
import { NextRequest, NextResponse } from "next/server";
import {
  parseSignupPeriod,
  SIGNUP_PERIOD_LABELS,
  FREE_USER_EMAIL_SEND_LIMIT,
} from "@/lib/admin/free-user-email-config";
import { listFreeUserEmailRecipientsForSend } from "@/lib/admin/free-user-email-audience";
import {
  getResendClient,
  ResendSendError,
  resolveResendFromAddress,
  sendResendHtmlEmail,
} from "@/lib/email/resend-client";
import {
  buildNurtureMergeFields,
  renderNurtureEmail,
} from "@/lib/nurture-email/merge-fields";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z
  .object({
    period: z.enum(["last_3_days", "last_7_days", "last_30_days"]),
    subject: z.string().trim().min(1).max(200),
    htmlBody: z.string().trim().min(1).max(500_000).optional(),
    bodyHtml: z.string().trim().min(1).max(500_000).optional(),
    confirm: z.literal(true),
  })
  .refine((data) => Boolean(data.htmlBody?.trim() || data.bodyHtml?.trim()), {
    message: "Email body (htmlBody) is required.",
    path: ["htmlBody"],
  });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdminApi(request);
    if (!admin.ok) return admin.response;

    if (!getResendClient()) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY is not configured on the server." },
        { status: 400 }
      );
    }

    if (!resolveResendFromAddress()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Set RESEND_FROM_EMAIL or FROM_EMAIL to a Resend-verified sender.",
        },
        { status: 400 }
      );
    }

    const json = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid body.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const period = parseSignupPeriod(parsed.data.period);
    if (!period) {
      return NextResponse.json({ ok: false, error: "Invalid signup period." }, { status: 400 });
    }

    const htmlBody = (parsed.data.htmlBody ?? parsed.data.bodyHtml)?.trim();
    if (!htmlBody) {
      return NextResponse.json(
        { ok: false, error: "Email body (htmlBody) is required." },
        { status: 400 }
      );
    }

    const recipients = await listFreeUserEmailRecipientsForSend(period);
    if (recipients.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `No free users with email found for ${SIGNUP_PERIOD_LABELS[period]}.`,
        },
        { status: 400 }
      );
    }

    const seenEmails = new Set<string>();
    const uniqueRecipients = recipients.filter((r) => {
      if (seenEmails.has(r.email)) return false;
      seenEmails.add(r.email);
      return true;
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const recipient of uniqueRecipients) {
      try {
        const mergeFields = buildNurtureMergeFields({
          firstName: recipient.firstName,
          email: recipient.email,
        });
        const rendered = renderNurtureEmail(parsed.data.subject, htmlBody, mergeFields);

        await sendResendHtmlEmail({
          to: recipient.email,
          subject: rendered.subject,
          html: rendered.html,
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        const msg =
          error instanceof ResendSendError
            ? `${recipient.email}: ${error.message}`
            : `${recipient.email}: ${error instanceof Error ? error.message : "send failed"}`;
        errors.push(msg);
        if (errors.length >= 10) {
          // Keep error list bounded
          continue;
        }
      }

      // Gentle pacing for Resend rate limits (~2/sec on free tier)
      await sleep(550);
    }

    const capped = uniqueRecipients.length >= FREE_USER_EMAIL_SEND_LIMIT;

    return NextResponse.json({
      ok: true,
      period,
      periodLabel: SIGNUP_PERIOD_LABELS[period],
      attempted: uniqueRecipients.length,
      sent,
      failed,
      capped,
      cap: FREE_USER_EMAIL_SEND_LIMIT,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error("[admin user-emails send] failed:", error);
    const message = error instanceof Error ? error.message : "Bulk send failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
