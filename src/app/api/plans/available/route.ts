import { NextResponse } from "next/server";
import { loadActivePlansWithStripePrices } from "@/lib/loadActivePlansWithStripePrices";

/**
 * Plan catalog from `src/config/pricing-plans.json`, with live recurring price data from Stripe.
 */
export async function GET() {
  try {
    const plans = await loadActivePlansWithStripePrices();
    return NextResponse.json({ plans });
  } catch (err) {
    console.error("Error fetching available plans:", err);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
