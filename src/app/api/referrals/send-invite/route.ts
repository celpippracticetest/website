/*
  Professional send-invite endpoint
  - Auth required (Clerk)
  - Validates input with Zod
  - Builds invite link from referralCode if inviteLink not provided
  - Nodemailer transporter with environment checks
  - Optional Upstash Redis rate limiting (if envs provided)
  - Returns structured JSON errors

  Required envs for email:
    SMTP_HOST
    SMTP_PORT
    SMTP_USER
    SMTP_PASS
    FROM_EMAIL (e.g. "Celpip Practice <no-reply@domain>")
  Optional envs:
    APP_BASE_URL (e.g. https://celpippracticetest.com)
    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN
    RESEND_API_KEY (optional: use Resend HTTP API if set)
    SENDGRID_API_KEY (optional: use SendGrid HTTP API if set)
*/

import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";

export const runtime = "nodejs"; // nodemailer requires node runtime
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

function assertEnv(name: string, allowEmpty = false) {
  const v = process.env[name];

  if (!v && !allowEmpty) throw new Error(`Missing required env: ${name}`);
  return v ?? "";
}

async function getTransporter(): Promise<Transporter> {
  const host = assertEnv("SMTP_HOST");
  const port = Number(assertEnv("SMTP_PORT"));
  const user = assertEnv("SMTP_USER");
  const pass = assertEnv("SMTP_PASS");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Verify only once at cold start; ignore failures in prod but log
  try {
    await transporter.verify();
  } catch (e) {
    console.warn("[send-invite] SMTP verify failed (continuing):", e);
  }

  return transporter;
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

// ---------- Email senders (Resend / SendGrid / SMTP fallback) ----------
function parseFromAddress(from: string): { email: string; name?: string } {
  // Accept formats like "Name <email@domain>" or plain email
  const m = from.match(/^(.*)<([^>]+)>\s*$/);
  if (m) {
    const name = m[1].trim().replace(/^["']|["']$/g, "");
    const email = m[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: from };
}

async function sendViaResend({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[send-invite] Resend failed:", res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[send-invite] Resend threw:", e);
    return false;
  }
}

async function sendViaSendGrid({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: parseFromAddress(from),
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("[send-invite] SendGrid failed:", res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[send-invite] SendGrid threw:", e);
    return false;
  }
}

async function sendViaSMTP({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = await getTransporter();
  await transporter.sendMail({ from, to, subject, html });
  return true;
}

async function sendEmail({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  // Priority: Resend -> SendGrid -> SMTP
  if (await sendViaResend({ from, to, subject, html })) return;
  if (await sendViaSendGrid({ from, to, subject, html })) return;
  await sendViaSMTP({ from, to, subject, html });
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
    const inviter = await clerkClient.users.getUser(user.id);
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

    // 6) Prepare email
    const from =
      process.env.FROM_EMAIL || `Celpip Practice <${process.env.SMTP_USER}>`;

    // 7) Send via Resend / SendGrid / SMTP fallback
    const subject = "You're invited to CELPIP Practice Test";
    const html = emailHtml({
      toName: name,
      inviterName: inviter.firstName
        ? `${inviter.firstName} ${inviter.lastName ?? ""}`.trim()
        : "A friend",
      link,
      personalMessage,
    });

    await sendEmail({ from, to: email, subject, html });

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
