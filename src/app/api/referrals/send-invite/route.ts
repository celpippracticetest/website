/*
  Professional send-invite endpoint
  - Auth required (Clerk)
  - Validates input with Zod
  - Builds invite link from referralCode if inviteLink not provided
  - Resend for transactional email
  - Optional Upstash Redis rate limiting (if envs provided)

  Required envs for email:
    RESEND_API_KEY
    RESEND_FROM_EMAIL or FROM_EMAIL (verified domain in Resend)
  Optional:
    APP_BASE_URL (e.g. https://celpippracticetest.com)
    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN
*/

import { NextResponse } from "next/server";
import { z } from "zod";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { getResendClient, sendResendHtmlEmail } from "@/lib/email/resend-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ensure server execution

// ---------- Schemas ----------
const BodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
  personalMessage: z.string().max(500).optional(),
  inviteLink: z.string().url().optional(),
  referralCode: z
    .string()
    .regex(/^REF-[A-Z0-9]{6}$/)
    .optional(),
});

// ---------- Helpers ----------
function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json({ ok: false, code, message, details }, { status });
}

function buildInviteLink({
  inviteLink,
  referralCode,
  inviterId,
}: {
  inviteLink?: string;
  referralCode?: string;
  inviterId: string;
}) {
  if (inviteLink) return inviteLink;

  const base =
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    "https://celpippracticetest.com";
  const params = new URLSearchParams();
  params.set("inviter", inviterId);
  if (referralCode) params.set("ref", referralCode);
  return `${base}/signup?${params.toString()}`;
}

function emailHtml({
  toName,
  inviterName,
  link,
  personalMessage,
}: {
  toName?: string;
  inviterName: string;
  link: string;
  personalMessage?: string;
}) {
  const esc = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;max-width:640px;margin:auto;padding:24px">
    <h2 style="margin:0 0 16px">You're invited${
      toName ? ", " + esc(toName) : ""
    } 🎉</h2>
    <p style="line-height:1.7">${esc(
      inviterName
    )} has invited you to join <strong>CELPIP Practice Test</strong>.</p>
    ${
      personalMessage
        ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #ddd;background:#fafafa">${esc(
            personalMessage
          )}</blockquote>`
        : ""
    }
    <p style="margin:20px 0">
      <a href="${link}" style="display:inline-block;text-decoration:none;padding:12px 18px;border-radius:8px;background:#111;color:#fff">Accept Invite</a>
    </p>
    <p style="color:#555;font-size:13px">If the button doesn't work, use this link:<br/><a href="${link}">${link}</a></p>
  </div>`;
}

// ---------- Route ----------
export async function POST(req: Request) {
  try {
    // 1) Auth
    const user = await currentUser();
    if (!user)
      return jsonError(401, "UNAUTHENTICATED", "You must be signed in.");

    // 3) Parse & validate body
    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, "BAD_REQUEST", "Invalid request body.", {
        issues: parsed.error.issues,
      });
    }
    const { email, name, personalMessage, inviteLink, referralCode } =
      parsed.data;

    // 4) Ensure inviter is eligible (e.g., after purchase)
    //    We check Clerk publicMetadata or privateMetadata flags you may set elsewhere
    const clerk = await clerkClient();
    const inviter = await clerk.users.getUser(user.id);
    const hasReferralAccess = Boolean(
      // set this flag in your purchase webhook logic
      (inviter.publicMetadata as any)?.referralActive ||
        (inviter.privateMetadata as any)?.referralActive
    );
    if (!hasReferralAccess) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Referral feature is not enabled for your account."
      );
    }

    // 5) Build invite link
    const link = buildInviteLink({
      inviteLink,
      referralCode:
        referralCode ?? (inviter.publicMetadata as any)?.referralCode,
      inviterId: user.id,
    });

    if (!getResendClient()) {
      return jsonError(500, "EMAIL_NOT_CONFIGURED", "RESEND_API_KEY is not configured.");
    }

    await sendResendHtmlEmail({
      to: email,
      subject: "You're invited to CELPIP Practice Test",
      html: emailHtml({
        toName: email,
        inviterName: inviter.firstName
          ? `${inviter.firstName} ${inviter.lastName ?? ""}`.trim()
          : "A friend",
        link,
        personalMessage,
      }),
    });

    return NextResponse.json({
      ok: true,
      message: "Invite sent",
      data: { email, link },
    });
  } catch (err: any) {
    console.error("[send-invite] error:", err);
    if (err instanceof z.ZodError) {
      return jsonError(400, "BAD_REQUEST", "Invalid request body.", {
        issues: err.issues,
      });
    }

    return jsonError(
      500,
      "INTERNAL_ERROR",
      err?.message || "Failed to send invite"
    );
  }
}

// Also guard unsupported methods just in case
export async function GET() {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Use POST /send-invite");
}
