import { NextRequest, NextResponse } from "next/server";

import { runStripeAttributionBackfill } from "@/lib/stripeAttributionBackfill";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const tokenParam = request.nextUrl.searchParams.get("token");
  const authHeader = request.headers.get("authorization");

  return Boolean(
    secret && (tokenParam === secret || authHeader === `Bearer ${secret}`)
  );
}

function readBooleanParam(
  request: NextRequest,
  key: string,
  defaultValue: boolean
): boolean {
  const value = request.nextUrl.searchParams.get(key);
  if (value == null) return defaultValue;
  return value === "true" || value === "1";
}

function readNumberParam(
  request: NextRequest,
  key: string,
  defaultValue: number
): number {
  const value = request.nextUrl.searchParams.get(key);
  if (value == null) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

async function handleBackfill(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runStripeAttributionBackfill({
      limit: readNumberParam(request, "limit", 50),
      dryRun: readBooleanParam(request, "dryRun", true),
      invoiceLimitPerCustomer: readNumberParam(request, "invoiceLimit", 24),
      requireGoogleClickId: readBooleanParam(request, "requireGoogleClickId", true),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to backfill Stripe attribution metadata.";
    console.error("[stripe attribution backfill]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleBackfill(request);
}

export async function POST(request: NextRequest) {
  return handleBackfill(request);
}
