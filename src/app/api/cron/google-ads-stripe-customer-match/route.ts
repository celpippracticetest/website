import { NextRequest, NextResponse } from "next/server";
import { syncStripePayingCustomersCustomerMatch } from "@/lib/google-ads/stripe-customer-match-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const tokenParam = request.nextUrl.searchParams.get("token");
  const authHeader = request.headers.get("authorization");

  return Boolean(
    secret && (tokenParam === secret || authHeader === `Bearer ${secret}`),
  );
}

async function readValidateOnly(request: NextRequest) {
  const queryValue = request.nextUrl.searchParams.get("validateOnly");
  if (queryValue != null) return queryValue === "true" || queryValue === "1";

  if (request.method !== "POST") return false;
  const body = await request.json().catch(() => null);
  return body?.validateOnly === true;
}

async function handleSync(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const validateOnly = await readValidateOnly(request);
    const result = await syncStripePayingCustomersCustomerMatch({ validateOnly });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to sync Stripe customers to Google Ads Customer Match.";
    console.error("[google-ads stripe customer-match sync]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
