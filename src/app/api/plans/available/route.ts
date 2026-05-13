import { NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import { loadActivePlansWithStripePrices } from "@/lib/loadActivePlansWithStripePrices";

/**
 * Same plan catalog and ordering as `/pricing` (active plans in the document store), with live
 * recurring price data from Stripe — mirrors checkout and pricing `stripePriceId` usage.
 */
export async function GET() {
  try {
    const db = await getDb();
    const plans = await loadActivePlansWithStripePrices(db);
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Error fetching available plans:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch plans";
    if (
      message.includes("DATABASE_URL") ||
      message.includes("not initialized")
    ) {
      return NextResponse.json({ plans: [], error: "Database unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
