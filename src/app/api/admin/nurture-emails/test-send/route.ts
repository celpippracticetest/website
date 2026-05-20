import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";
import { renderNurtureEmail, sampleNurtureMergeFields } from "@/lib/nurture-email/merge-fields";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(500_000),
  htmlBody: z.string().trim().min(1).max(500_000).optional(),
});

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authenticate = await auth();
  const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    if (!getResendClient()) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY is not configured on the server." },
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
    const htmlBody = parsed.data.htmlBody ?? parsed.data.bodyHtml;
    const mergeFields = sampleNurtureMergeFields();
    const rendered = renderNurtureEmail(subject, htmlBody, mergeFields);

    const result = await sendResendHtmlEmail({
      to,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
    });

    return NextResponse.json({ ok: true, resendId: result.id ?? null }, { status: 200 });
  } catch (error) {
    console.error("[admin nurture-emails test-send] failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send test email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
