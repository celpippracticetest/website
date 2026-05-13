import { auth, currentUser } from "@/lib/auth/server-auth";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import {
  ABANDONED_CART_EMAIL_CONFIG_COLLECTION,
  ABANDONED_CART_EMAIL_CONFIG_KEY,
  buildAbandonedCartEmailConfigWithDefaults,
} from "@/lib/abandoned-cart-email/config";
import { applyMergeTags, getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  stageId: z.string().trim().min(1).max(100),
  to: z.string().trim().email(),
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
  const roles = authenticate.sessionClaims?.metadata?.roles;
  const isAdmin = Array.isArray(roles) && roles.some((r) => r === "admin");
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

    const db = await getDb();
    const col = db.collection(ABANDONED_CART_EMAIL_CONFIG_COLLECTION);
    const doc = await col.findOne({ configKey: ABANDONED_CART_EMAIL_CONFIG_KEY });
    const config = buildAbandonedCartEmailConfigWithDefaults(doc?.config || null);
    const stage = config.stages.find((s) => s.id === parsed.data.stageId);
    if (!stage) {
      return NextResponse.json({ ok: false, error: "Stage not found." }, { status: 404 });
    }

    const sample = {
      first_name: "Alex",
      email: parsed.data.to,
      checkout_url: "https://example.com/checkout-sample",
      product_name: "CELPIP Practice (sample)",
    };

    const subject = applyMergeTags(stage.subject, sample);
    const html = applyMergeTags(stage.htmlBody, sample);

    const result = await sendResendHtmlEmail({
      to: parsed.data.to,
      subject: `[TEST] ${subject}`,
      html,
    });

    return NextResponse.json({ ok: true, resendId: result.id ?? null }, { status: 200 });
  } catch (error) {
    console.error("[admin abandoned-cart-emails test-send] failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send test email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
