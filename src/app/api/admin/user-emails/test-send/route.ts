import { ensureAdminApi } from "@/lib/auth/ensure-admin-api";
import { NextRequest, NextResponse } from "next/server";
import {
  getResendClient,
  ResendSendError,
  resolveResendFromAddress,
  sendResendHtmlEmail,
} from "@/lib/email/resend-client";
import { renderNurtureEmail, sampleNurtureMergeFields } from "@/lib/nurture-email/merge-fields";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    to: z.string().trim().email(),
    subject: z.string().trim().min(1).max(200),
    htmlBody: z.string().trim().min(1).max(500_000).optional(),
    bodyHtml: z.string().trim().min(1).max(500_000).optional(),
  })
  .refine((data) => Boolean(data.htmlBody?.trim() || data.bodyHtml?.trim()), {
    message: "Email body (htmlBody) is required.",
    path: ["htmlBody"],
  });

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

    const { to, subject } = parsed.data;
    const htmlBody = (parsed.data.htmlBody ?? parsed.data.bodyHtml)?.trim();
    if (!htmlBody) {
      return NextResponse.json(
        { ok: false, error: "Email body (htmlBody) is required." },
        { status: 400 }
      );
    }

    const rendered = renderNurtureEmail(subject, htmlBody, sampleNurtureMergeFields());

    const result = await sendResendHtmlEmail({
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
    });

    return NextResponse.json({ ok: true, resendId: result.id ?? null }, { status: 200 });
  } catch (error) {
    console.error("[admin user-emails test-send] failed:", error);

    if (error instanceof ResendSendError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code ?? null,
          hint:
            error.code === "validation_error"
              ? "Check RESEND_FROM_EMAIL / FROM_EMAIL matches a verified domain in Resend."
              : undefined,
        },
        { status: 502 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to send test email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
