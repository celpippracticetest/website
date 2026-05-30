import { NextRequest, NextResponse } from "next/server";
import { buildHashedCustomerMatchCsv } from "@/lib/google-ads/customer-match-csv";
import {
  googleDataManagerHttpsUnauthorizedResponse,
  isGoogleDataManagerHttpsConfigured,
  verifyGoogleDataManagerHttpsAuth,
} from "@/lib/google-ads/data-manager-https-auth";
import { fetchStripePayingCustomerRecords } from "@/lib/google-ads/stripe-paying-customers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isGoogleDataManagerHttpsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Set GOOGLE_DATA_MANAGER_HTTPS_USERNAME and GOOGLE_DATA_MANAGER_HTTPS_PASSWORD.",
      },
      { status: 503 },
    );
  }

  if (!verifyGoogleDataManagerHttpsAuth(request)) {
    return googleDataManagerHttpsUnauthorizedResponse();
  }

  try {
    const records = await fetchStripePayingCustomerRecords();
    const csv = buildHashedCustomerMatchCsv(records);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'inline; filename="stripe-paying-customers.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build Stripe Customer Match CSV.";
    console.error("[google-ads stripe-paying-customers.csv]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
