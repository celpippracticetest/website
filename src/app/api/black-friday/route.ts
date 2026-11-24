import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import {
  countryFromRequestHeaders,
  isBlackFridayEligible,
} from "@/lib/blackFridayServer";

/**
 * Black Friday 2026 — TEMPORARY (revert Mon 2026-11-30).
 * Whether this visitor sees the 50% sale. Guests: by IP country only.
 * Signed-in users: also must never have paid. Checkout re-checks both.
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedRequestContext(req).catch(() => null);
  const eligible = await isBlackFridayEligible({
    country: countryFromRequestHeaders(req.headers),
    userId: ctx?.userId ?? null,
    metadata: (ctx?.user?.publicMetadata ?? null) as {
      hasEverPurchased?: unknown;
    } | null,
  });
  return NextResponse.json(
    { eligible },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
