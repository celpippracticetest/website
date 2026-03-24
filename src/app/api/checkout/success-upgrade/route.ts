import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import { resolveSuccessUpgradeOffer } from "@/lib/successPageUpgrade";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

async function parseSessionId(req: NextRequest): Promise<string | undefined> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await req.json();
      return typeof body.session_id === "string"
        ? body.session_id.trim()
        : undefined;
    } catch {
      return undefined;
    }
  }
  try {
    const fd = await req.formData();
    const v = fd.get("session_id");
    return typeof v === "string" ? v.trim() : undefined;
  } catch {
    return undefined;
  }
}

function stripeErrMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Upgrade failed";
}

/**
 * Applies the success-page upgrade by updating the existing Stripe subscription
 * (same payment method, no hosted Checkout).
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!user || !email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session_id = await parseSessionId(req);
  if (!session_id || !session_id.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
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

  const resolved = await resolveSuccessUpgradeOffer(session_id, db, {
    clerkUserId: user.id,
    clerkEmail: email,
  });

  if (!resolved) {
    return NextResponse.json(
      { error: "No upgrade offer for this purchase" },
      { status: 400 }
    );
  }

  let coupon;
  try {
    coupon = await stripe.coupons.create({
      amount_off: resolved.discountOffCents,
      currency: resolved.currency,
      duration: "once",
      name: `Success upgrade — ${resolved.targetPlanTitle}`.slice(0, 80),
      metadata: {
        success_upgrade: "true",
        from_checkout_session: session_id,
        clerk_user_id: user.id,
      },
    });
  } catch (err) {
    console.error("[success-upgrade] coupon create failed", err);
    return NextResponse.json(
      { error: "Could not apply upgrade discount" },
      { status: 500 }
    );
  }

  let checkoutSession;
  try {
    checkoutSession = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription"],
    });
  } catch (err) {
    console.error("[success-upgrade] retrieve checkout session failed", err);
    return NextResponse.json(
      { error: "Could not load your purchase" },
      { status: 502 }
    );
  }

  const subRaw = checkoutSession.subscription;
  const subscriptionId =
    typeof subRaw === "string" ? subRaw : (subRaw?.id ?? null);

  if (!subscriptionId) {
    return NextResponse.json(
      {
        error:
          "This purchase is not a subscription, so it cannot be upgraded automatically.",
      },
      { status: 400 }
    );
  }

  let subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
  } catch (err) {
    console.error("[success-upgrade] retrieve subscription failed", err);
    return NextResponse.json(
      { error: "Could not load your subscription" },
      { status: 502 }
    );
  }

  const item = subscription.items.data[0];
  if (!item?.id) {
    return NextResponse.json(
      { error: "Subscription has no billable items" },
      { status: 400 }
    );
  }

  const nextMetadata: Record<string, string> = {
    ...(subscription.metadata ?? {}),
    success_upgrade: "true",
    upgraded_from_checkout_session: session_id,
    plan_name: resolved.targetPlanTitle,
  };

  try {
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: item.id,
          price: resolved.targetPriceId,
        },
      ],
      discounts: [{ coupon: coupon.id }],
      proration_behavior: "create_prorations",
      payment_behavior: "error_if_incomplete",
      metadata: nextMetadata,
    });
  } catch (err) {
    console.error("[success-upgrade] subscription update failed", err);
    return NextResponse.json(
      { error: stripeErrMessage(err) },
      { status: 502 }
    );
  }

  try {
    await syncUserPlanPublicMetadata(user.id, {
      plan: resolved.clerkPlanKey,
      planType: resolved.targetPlanTitle,
      planCancelled: false,
      planExpiresAt: null,
    });
  } catch (metaErr) {
    console.error("[success-upgrade] Clerk plan metadata sync failed", metaErr);
  }

  return NextResponse.json({ ok: true });
}
