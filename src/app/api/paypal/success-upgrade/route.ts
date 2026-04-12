import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { PlansRepository } from "@/repositories/plans.repo";
import {
  resolveSuccessUpgradeOfferFromSourcePrice,
} from "@/lib/successPageUpgrade";
import { paypalApiJson } from "@/lib/paypal/subscriptionsApi";
import { resolvePayPalPlanIdForStripePrice } from "@/lib/paypal/planMap";
import { resolveOrCreatePayPalPromoUpgradePlanId } from "@/lib/paypal/billingPlans";
import { getPayPalCheckoutPublicOrigin } from "@/lib/requestOrigin";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviseResponse = {
  links?: Array<{ rel?: string; href?: string }>;
};

async function parseSubscriptionId(req: NextRequest): Promise<string | null> {
  try {
    const body = (await req.json()) as { subscription_id?: string };
    const raw = typeof body?.subscription_id === "string" ? body.subscription_id.trim() : "";
    return /^I-[A-Z0-9]+$/i.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptionId = await parseSubscriptionId(req);
  if (!subscriptionId) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  let db;
  try {
    db = await getDb();
  } catch {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  const pending = await db.collection("paypal_subscription_pending").findOne<{
    stripePriceId?: string;
    clerkUserId?: string;
  }>({
    clerkUserId: user.id,
    paypalSubscriptionId: subscriptionId,
  });
  const sourceStripePriceId = pending?.stripePriceId?.trim();
  if (!sourceStripePriceId) {
    return NextResponse.json(
      { error: "No upgrade offer for this purchase" },
      { status: 400 }
    );
  }

  const resolved = await resolveSuccessUpgradeOfferFromSourcePrice(
    sourceStripePriceId,
    db,
    subscriptionId
  );
  if (!resolved) {
    return NextResponse.json(
      { error: "No upgrade offer for this purchase" },
      { status: 400 }
    );
  }

  const targetPayPalPlanId = await resolvePayPalPlanIdForStripePrice(
    resolved.targetPriceId
  );
  if (!targetPayPalPlanId || !targetPayPalPlanId.startsWith("P-")) {
    return NextResponse.json(
      { error: "PayPal upgrade plan is not configured" },
      { status: 422 }
    );
  }

  const plansRepo = new PlansRepository(db);
  const sourcePlan = await plansRepo.findActivePlanByStripePriceId(sourceStripePriceId);
  const targetPlan = await plansRepo.findActivePlanByStripePriceId(resolved.targetPriceId);
  const sourcePayPalProductId = sourcePlan?.paypalProductId?.trim();
  const targetPayPalProductId = targetPlan?.paypalProductId?.trim();
  if (
    sourcePayPalProductId &&
    targetPayPalProductId &&
    sourcePayPalProductId !== targetPayPalProductId
  ) {
    return NextResponse.json(
      {
        error:
          "This PayPal upgrade path is unavailable because the plans are in different PayPal products. Please change plan from your subscription settings instead.",
      },
      { status: 409 }
    );
  }

  const origin = await getPayPalCheckoutPublicOrigin();
  const returnUrl = `${origin}/success/paypal?subscription_id=${encodeURIComponent(subscriptionId)}`;
  const cancelUrl = `${origin}/practice-overview`;

  let planIdForRevise = targetPayPalPlanId;
  try {
    const promoNameHint = `${targetPlan?.title?.trim() || "CELPIP"} intro`.slice(0, 100);
    planIdForRevise = await resolveOrCreatePayPalPromoUpgradePlanId({
      basePayPalPlanId: targetPayPalPlanId,
      promoFirstPeriodCents: resolved.firstPeriodCents,
      regularUnitCents: resolved.targetUnitCents,
      currency: resolved.currency,
      nameHint: `${promoNameHint} ${subscriptionId.slice(-8)}`,
    });
  } catch (promoErr) {
    console.error("[paypal/success-upgrade] promo plan create failed", promoErr);
    return NextResponse.json(
      {
        error:
          "Could not prepare the discounted PayPal upgrade. Please try again or change plan from your profile.",
      },
      { status: 502 }
    );
  }

  let revise: ReviseResponse;
  try {
    revise = await paypalApiJson<ReviseResponse>(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/revise`,
      {
        method: "POST",
        body: JSON.stringify({
          plan_id: planIdForRevise,
          application_context: {
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      }
    );
  } catch (err) {
    const rawMessage =
      err instanceof Error && err.message ? err.message : "Could not apply PayPal upgrade";
    const genericValidation =
      /semantically incorrect|business validation|UNPROCESSABLE_ENTITY/i.test(rawMessage);
    const message = genericValidation
      ? "PayPal could not apply this upgrade automatically for this subscription. Please use Change Plan from your profile (PayPal billing) to switch plans."
      : rawMessage;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const approveHref = revise.links?.find((l) => l.rel === "approve")?.href;
  if (approveHref) {
    return NextResponse.json({
      ok: true,
      requiresApproval: true,
      approvalUrl: approveHref,
    });
  }

  try {
    await syncUserPlanPublicMetadata(user.id, {
      plan: resolved.clerkPlanKey,
      planType: resolved.targetPlanTitle,
      planCancelled: false,
      planExpiresAt: null,
    });
  } catch (err) {
    console.error("[paypal/success-upgrade] metadata sync failed", err);
  }

  return NextResponse.json({ ok: true });
}

