import { NextResponse } from "next/server";

import { getDb } from "@/lib/appDocumentsClient";
import { loadActivePlansWithStripePrices } from "@/lib/loadActivePlansWithStripePrices";

/**
 * Mobile catalog: active CMS plans with live Stripe price amounts.
 * Shape matches Flutter `SubscriptionPlan.fromJson` (`id` = Stripe price id).
 */
export async function GET() {
  try {
    const db = await getDb();
    const plans = await loadActivePlansWithStripePrices(db);

    return NextResponse.json({
      plans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        stripeProductId: plan.stripeProductId ?? null,
        metadata: {},
      })),
    });
  } catch (error) {
    console.error("[api/plans/available]", error);
    return NextResponse.json(
      { error: "Unable to load plans right now." },
      { status: 500 },
    );
  }
}
