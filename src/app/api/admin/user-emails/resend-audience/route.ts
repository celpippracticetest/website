import { ensureAdminApi } from "@/lib/auth/ensure-admin-api";
import { NextRequest, NextResponse } from "next/server";
import {
  FREE_USER_EMAIL_RESEND_SYNC_LIMIT,
  parseSignupPeriod,
  SIGNUP_PERIOD_LABELS,
} from "@/lib/admin/free-user-email-config";
import { listFreeUserEmailRecipientsForResendSync } from "@/lib/admin/free-user-email-audience";
import {
  createResendAudience,
  getResendClient,
  listResendAudiences,
  ResendApiError,
  syncRecipientsToResendAudience,
} from "@/lib/email/resend-client";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  period: z.enum(["last_3_days", "last_7_days", "last_30_days"]),
  mode: z.enum(["create", "existing"]),
  audienceId: z.string().trim().max(100).optional(),
  audienceName: z.string().trim().min(1).max(120).optional(),
  confirm: z.literal(true),
});

function defaultAudienceName(period: string): string {
  const label = SIGNUP_PERIOD_LABELS[period as keyof typeof SIGNUP_PERIOD_LABELS] ?? period;
  const date = new Date().toISOString().slice(0, 10);
  return `CMS free users · ${label} · ${date}`;
}

function resendErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const code = error instanceof ResendApiError ? error.code : undefined;
  const status =
    error instanceof ResendApiError
      ? error.statusCode === 401
        ? 403
        : error.statusCode >= 400 && error.statusCode < 600
          ? error.statusCode
          : 500
      : 500;
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const admin = await ensureAdminApi(request);
    if (!admin.ok) return admin.response;

    if (!getResendClient()) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY is not configured on the server." },
        { status: 400 }
      );
    }

    const audiences = await listResendAudiences();
    return NextResponse.json({ ok: true, data: audiences }, { status: 200 });
  } catch (error) {
    console.error("[admin user-emails resend-audience] GET failed:", error);
    return resendErrorResponse(error, "Failed to load Resend audiences.");
  }
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

    const recipients = await listFreeUserEmailRecipientsForResendSync(period);
    if (recipients.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `No free users with email found for ${SIGNUP_PERIOD_LABELS[period]}.`,
        },
        { status: 400 }
      );
    }

    let audienceId = parsed.data.audienceId?.trim() ?? "";
    let audienceName = parsed.data.audienceName?.trim() ?? "";

    if (parsed.data.mode === "create") {
      const created = await createResendAudience(
        audienceName || defaultAudienceName(period)
      );
      audienceId = created.id;
      audienceName = created.name;
    } else {
      if (!audienceId) {
        return NextResponse.json(
          { ok: false, error: "Select an existing Resend audience." },
          { status: 400 }
        );
      }
      const audiences = await listResendAudiences();
      const match = audiences.find((a) => a.id === audienceId);
      audienceName = match?.name ?? audienceId;
    }

    const sync = await syncRecipientsToResendAudience({
      audienceId,
      audienceName,
      recipients,
      cap: FREE_USER_EMAIL_RESEND_SYNC_LIMIT,
    });

    return NextResponse.json({
      ok: true,
      period,
      periodLabel: SIGNUP_PERIOD_LABELS[period],
      audienceId: sync.audienceId,
      audienceName: sync.audienceName,
      totalInFilter: recipients.length,
      attempted: sync.attempted,
      added: sync.added,
      failed: sync.failed,
      capped: sync.capped,
      cap: sync.cap,
      errors: sync.errors,
    });
  } catch (error) {
    console.error("[admin user-emails resend-audience] POST failed:", error);
    return resendErrorResponse(error, "Failed to sync audience to Resend.");
  }
}
