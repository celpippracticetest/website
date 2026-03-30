import { NextResponse } from "next/server";
import { attachStripePricingToSerializedPlans } from "@/lib/loadActivePlansWithStripePrices";
import { getAccessTierKey } from "@/lib/pricing";
import { getDb } from "@/lib/mongodb";
import { PlansRepository } from "@/repositories/plans.repo";
import type { SerializedPlan } from "@/types/pricing";

function serializePlan(plan: {
  _id?: unknown;
  title: string;
  type: string;
  planTitle: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  billingInterval?: SerializedPlan["billingInterval"];
  billingIntervalCount?: number;
  stripePriceId?: string;
  iconType?: string;
  iconWrapperColor?: string;
  order?: number;
}): SerializedPlan {
  const id = plan._id;
  const idStr =
    typeof id === "string" ? id : (id as { toString?: () => string })?.toString?.();
  return {
    _id: idStr ?? undefined,
    title: plan.title,
    type: plan.type,
    planTitle: plan.planTitle,
    oldPrice: plan.oldPrice,
    price: plan.price,
    discount: plan.discount,
    buttonTitle: plan.buttonTitle,
    features: plan.features,
    billingInterval: plan.billingInterval,
    billingIntervalCount: plan.billingIntervalCount,
    stripePriceId: plan.stripePriceId,
    iconType: plan.iconType as SerializedPlan["iconType"],
    iconWrapperColor: plan.iconWrapperColor,
    order: plan.order,
  };
}

/**
 * Premium-tier plans only (excludes Premium Plus), with amounts from Stripe — same
 * rules as /pricing plus checkout.
 */
export async function GET() {
  try {
    const db = await getDb();
    const repo = new PlansRepository(db);
    const activePlans = await repo.getActivePlans();
    const serialized = activePlans.map(serializePlan);
    const withStripe = await attachStripePricingToSerializedPlans(serialized);
    const premiumOnly = withStripe.filter(
      (p) => getAccessTierKey(p) === "premium" && Boolean(p.stripePriceId?.trim())
    );
    return NextResponse.json({ plans: premiumOnly });
  } catch (err) {
    console.error("express-entry plans:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch plans";
    if (message.includes("MONGODB_URI") || message.includes("not initialized")) {
      return NextResponse.json({ plans: [], error: "Database unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}
