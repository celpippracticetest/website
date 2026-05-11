import { NextRequest, NextResponse } from "next/server";
import { getActivePlansCatalog } from "@/lib/plansCatalog";

/**
 * Public catalog for marketing UI (header pricing drawer, etc.).
 * By default returns **Plus-tier** plans only. Pass `?all=1` for every active plan
 * (same set `/pricing` uses for grouping).
 */
export async function GET(request: NextRequest) {
  try {
    const allActive = request.nextUrl.searchParams.get("all") === "1";
    const plans = await getActivePlansCatalog({ plusOnly: !allActive });
    return NextResponse.json({ plans });
  } catch (e) {
    console.error("GET /api/plans/catalog:", e);
    return NextResponse.json(
      { error: "Failed to load plans", plans: [] as unknown[] },
      { status: 500 }
    );
  }
}
