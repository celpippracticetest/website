import { NextRequest, NextResponse } from "next/server";
import {
  googleDataManagerHttpsUnauthorizedResponse,
  isGoogleDataManagerHttpsConfigured,
  verifyGoogleDataManagerHttpsAuth,
} from "@/lib/google-ads/data-manager-https-auth";
import { readStripePayingCustomersCsvCache } from "@/lib/google-ads/stripe-paying-customers-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isGoogleDataManagerHttpsConfigured()) {
    return new NextResponse(
      "Email\r\nConfigure GOOGLE_DATA_MANAGER_HTTPS_USERNAME and GOOGLE_DATA_MANAGER_HTTPS_PASSWORD on the server.\r\n",
      {
        status: 503,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  if (!verifyGoogleDataManagerHttpsAuth(request)) {
    return googleDataManagerHttpsUnauthorizedResponse();
  }

  try {
    const cache = await readStripePayingCustomersCsvCache();
    if (!cache) {
      return new NextResponse(
        "Email\r\nRun /api/cron/google-ads-stripe-customer-match first to populate the export cache.\r\n",
        {
          status: 503,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "private, no-store",
          },
        },
      );
    }

    return new NextResponse(cache.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="stripe-paying-customers.csv"',
        "Cache-Control": "private, no-store",
        "X-Record-Count": String(cache.recordCount),
        "X-Generated-At": new Date(cache.generatedAt).toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load Stripe Customer Match CSV.";
    console.error("[google-ads stripe-paying-customers.csv]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
