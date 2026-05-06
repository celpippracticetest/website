import { addContactToResendAudience, getResendClient } from "@/lib/email/resend-client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().trim().email(),
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const rateLimiterStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const realIp = request.headers.get("x-real-ip");
  return (forwardedFor || realIp || "unknown").trim();
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const state = rateLimiterStore.get(key);
  if (!state || state.resetAt <= now) {
    rateLimiterStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (state.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  state.count += 1;
  return false;
}

/** Derive a short first name from the email local part */
function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "";
  if (!local) return "Express Entry";
  const cleaned = local.replace(/[._+]+/g, " ").trim();
  if (!cleaned) return "Express Entry";
  const word = cleaned.split(/\s+/)[0] ?? cleaned;
  if (word.length === 0) return "Express Entry";
  return word.slice(0, 1).toUpperCase() + word.slice(1, 80).toLowerCase();
}

/** Add express-entry signups to a Resend Audience (set RESEND_EXPRESS_ENTRY_AUDIENCE_ID). */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";
    if (isRateLimited(`express-entry:${ip}:${userAgent.slice(0, 80)}`)) {
      return NextResponse.json(
        { ok: false, message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid email.", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const audienceId = process.env.RESEND_EXPRESS_ENTRY_AUDIENCE_ID?.trim();
    if (!getResendClient() || !audienceId) {
      return NextResponse.json({
        ok: true,
        synced: false,
        message:
          "Resend not configured (RESEND_API_KEY and RESEND_EXPRESS_ENTRY_AUDIENCE_ID required for list sync).",
      });
    }

    const email = parsed.data.email.toLowerCase();
    await addContactToResendAudience({
      audienceId,
      email,
      firstName: firstNameFromEmail(email),
    });

    return NextResponse.json({ ok: true, synced: true });
  } catch (err) {
    console.error("[subscribe/express-entry]", err);
    return NextResponse.json(
      {
        ok: true,
        synced: false,
        message: err instanceof Error ? err.message : "Resend sync failed",
      },
      { status: 200 }
    );
  }
}
