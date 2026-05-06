import mongoClient from "@/lib/mongodb";
import {
  LeadCaptureLeadWriteSchema,
  LeadTriggerSourceEnumSchema,
} from "@/models/lead-capture.model";
import { addContactToResendAudience, getResendClient } from "@/lib/email/resend-client";
import { LeadCaptureConfigRepository } from "@/repositories/lead-capture-config.repo";
import { LeadCaptureLeadRepository } from "@/repositories/lead-capture-lead.repo";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SubscribeBodySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  sourceUrl: z.string().trim().min(1).optional(),
  triggerSource: LeadTriggerSourceEnumSchema.optional(),
  leadCaptureId: z.string().trim().optional(),
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const DUPLICATE_LEAD_COOLDOWN_MINUTES = 10;

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
    rateLimiterStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (state.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  state.count += 1;
  rateLimiterStore.set(key, state);
  return false;
}

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimiterStore.entries()) {
    if (value.resetAt <= now) {
      rateLimiterStore.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    cleanupRateLimitStore();

    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") || "";
    const rateLimitKey = `${ip}:${userAgent.slice(0, 120)}`;

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { ok: false, message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = SubscribeBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { ok: false, message: "Invalid subscribe payload.", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const leadRepo = new LeadCaptureLeadRepository(mongoClient);
    await leadRepo.ensureIndexes();
    const configRepo = new LeadCaptureConfigRepository(mongoClient);
    await configRepo.ensureIndexes();

    const sourceUrl = parsedBody.data.sourceUrl || request.headers.get("referer") || "unknown";
    const emailLower = parsedBody.data.email.toLowerCase();
    const existing = await leadRepo.findRecentByEmailLower(
      emailLower,
      DUPLICATE_LEAD_COOLDOWN_MINUTES
    );
    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          message: "You are already subscribed.",
          data: { alreadySubscribed: true },
        },
        { status: 200 }
      );
    }

    const leadWriteInput = LeadCaptureLeadWriteSchema.parse({
      firstName: parsedBody.data.firstName,
      email: parsedBody.data.email,
      sourceUrl,
      leadCaptureId: parsedBody.data.leadCaptureId,
      triggerSource: parsedBody.data.triggerSource || "manual",
      userAgent,
      ipAddress: ip,
      senderSyncStatus: "pending",
    });

    const campaignConfig =
      parsedBody.data.leadCaptureId
        ? await configRepo.getConfigById(parsedBody.data.leadCaptureId)
        : null;
    if (campaignConfig) {
      leadWriteInput.leadCaptureName = campaignConfig.name;
      leadWriteInput.senderGroupId = campaignConfig.senderGroupId || undefined;
    }

    const savedLead = await leadRepo.createLead(leadWriteInput);

    const audienceId =
      (savedLead.senderGroupId && savedLead.senderGroupId.trim()) ||
      process.env.RESEND_DEFAULT_LEADS_AUDIENCE_ID?.trim() ||
      "";

    if (!getResendClient()) {
      await leadRepo.updateSenderSyncStatus(
        savedLead.id,
        "failed",
        "RESEND_API_KEY is not configured"
      );
    } else if (!audienceId) {
      await leadRepo.updateSenderSyncStatus(
        savedLead.id,
        "failed",
        "No Resend audience: set campaign audience in admin or RESEND_DEFAULT_LEADS_AUDIENCE_ID"
      );
    } else {
      try {
        await addContactToResendAudience({
          audienceId,
          email: savedLead.email,
          firstName: savedLead.firstName,
        });
        await leadRepo.updateSenderSyncStatus(savedLead.id, "synced");
      } catch (resendError) {
        console.error("[subscribe] Resend audience sync failed:", resendError);
        await leadRepo.updateSenderSyncStatus(
          savedLead.id,
          "failed",
          resendError instanceof Error ? resendError.message : "Resend audience sync error"
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Subscription successful.",
        data: { id: savedLead.id },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[subscribe] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to subscribe. Please try again." },
      { status: 500 }
    );
  }
}
