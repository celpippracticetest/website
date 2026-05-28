import { NextResponse } from "next/server";
import { getActivePlansCatalog } from "@/lib/plansCatalog";

/** Public Plus plan catalog for marketing UI (header pricing drawer, etc.). */
export async function GET() {
  try {
    const plans = await getActivePlansCatalog();
    return NextResponse.json({ plans });
  } catch (e) {
    console.error("GET /api/plans/catalog:", e);
    return NextResponse.json(
      { error: "Failed to load plans", plans: [] as unknown[] },
      { status: 500 }
    );
  }
}
