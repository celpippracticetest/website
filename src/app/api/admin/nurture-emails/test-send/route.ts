import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  to: z.string().trim().email(),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1).max(500_000),
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
  const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
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

    const { to, subject, bodyHtml } = parsed.data;

    const result = await sendResendHtmlEmail({
      to,
      subject: `[TEST] ${subject}`,
      html: bodyHtml,
    });

    return NextResponse.json({ ok: true, resendId: result.id ?? null }, { status: 200 });
  } catch (error) {
    console.error("[admin nurture-emails test-send] failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send test email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
