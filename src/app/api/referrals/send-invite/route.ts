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
    SMTP_AUTH_METHOD (optional: PLAIN | LOGIN | CRAM-MD5)
    EMAIL_DEBUG (optional: set to 1 to enable nodemailer logger)
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
  const authMethodEnv = (process.env.SMTP_AUTH_METHOD || "").toUpperCase();
  const authMethod = ["PLAIN", "LOGIN", "CRAM-MD5"].includes(authMethodEnv)
    ? (authMethodEnv as "PLAIN" | "LOGIN" | "CRAM-MD5")
    : undefined;

  // Non-sensitive sanity log (helps verify env presence on Vercel Preview)
  console.log("[send-invite] SMTP sanity", {
    host,
    port,
    hasUser: !!user,
    userLen: user?.length,
    hasPass: !!pass,
    passLen: String(pass || "").length,
    authMethod: authMethod || "auto",
  });

  const useSecure = port === 465; // SSL

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: useSecure,
    auth: { user, pass },
    // Some providers (e.g., Hostinger) prefer LOGIN over PLAIN
    // Allow overriding via SMTP_AUTH_METHOD, otherwise let Nodemailer auto-negotiate
    authMethod,
    // Improve compatibility for STARTTLS on 587
    requireTLS: !useSecure,
    tls: !useSecure
      ? {
          minVersion: "TLSv1.2",
        }
      : undefined,
    // Optional debug toggles (set EMAIL_DEBUG=1 temporarily if needed)
    logger: !!process.env.EMAIL_DEBUG,
    debug: !!process.env.EMAIL_DEBUG,
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

// Optional: simple Upstash REST client for rate limit (per-user per minute)
async function rateLimitOrNull(userId: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // not configured

  const key = `rl:send-invite:${userId}`;
  const body = {
    // Lua-less simple INCR + EXPIRE if new
    pipeline: [
      ["INCR", key],
      ["EXPIRE", key, 60],
    ],
  } as const;

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) return null; // fail-open
  const data = (await res.json()) as [number, number][];
  const count = data?.[0]?.[1];
  return typeof count === "number" ? count : null;
}

// ---------- Route ----------
export async function POST(req: Request) {
  try {
    // 1) Auth
    const user = await currentUser();
    if (!user)
      return jsonError(401, "UNAUTHENTICATED", "You must be signed in.");

    // 2) Rate limit (optional)
    const rl = await rateLimitOrNull(user.id);
    if (rl !== null && rl > 10) {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Too many invites. Try again in a minute.",
        { count: rl }
      );
    }

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
    const transporter = await getTransporter();

    // 7) Send
    await transporter.sendMail({
      from,
      to: email,
      subject: "You're invited to CELPIP Practice Test",
      html: emailHtml({
        toName: name,
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
