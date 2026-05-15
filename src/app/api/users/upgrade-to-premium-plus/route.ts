import { NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/appDocumentsClient";
import type { Plan } from "@/models/plans.model";
import {
  getAccessTierKey,
  getDurationGroupKey,
  getDurationGroupKeyFromStripeRecurring,
} from "@/lib/pricing";
import { toSerializedPlan } from "@/lib/planSerialization";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { syncUserPlanPublicMetadata } from "@/lib/syncUserPlanPublicMetadata";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(userId);
    const meta = user.publicMetadata || {};
    const plan = meta.plan as string | undefined;
    const purchaseDate = meta.purchaseDate as string | undefined;

    if (!hasPaidPracticeAccess(plan, purchaseDate)) {
      return NextResponse.json(
        { error: "Upgrade is only available for active subscribers." },
        { status: 403 }
      );
    }

    const customerId = await resolveStripeCustomerId(userId, {
      stripeCustomerIdFromPrivate: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromAuthUser(user),
    });
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No billing account on file. Please manage your plan from your profile or pricing page.",
        },
        { status: 422 }
      );
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        {
          error:
            "No active subscription found. Use the pricing page to subscribe to Premium Plus.",
        },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];
    const item = subscription.items.data[0];
    const currentPriceId =
      typeof item.price === "string" ? item.price : item.price?.id;
    if (!currentPriceId) {
      return NextResponse.json(
        { error: "Could not read your current subscription price." },
        { status: 500 }
      );
    }

    const priceObj =
      typeof item.price === "string"
        ? await stripe.prices.retrieve(item.price)
        : item.price;

    const db = await getDb();
    const plans = (await db
      .collection("plans")
      .find({ isActive: true })
      .toArray()) as unknown as Plan[];

    const currentDoc = plans.find((p) => p.stripePriceId === currentPriceId);
    let durationKey = currentDoc
      ? getDurationGroupKey(toSerializedPlan(currentDoc))
      : null;

    if (!durationKey) {
      const recurring = priceObj.recurring;
      durationKey = getDurationGroupKeyFromStripeRecurring(
        recurring?.interval,
        recurring?.interval_count ?? undefined
      );
    }

    if (!durationKey) {
      return NextResponse.json(
        {
          error:
            "Could not match your billing period to a Premium Plus plan. Please upgrade from the pricing page.",
        },
        { status: 422 }
      );
    }

    const currentTier = currentDoc
      ? getAccessTierKey(toSerializedPlan(currentDoc))
      : null;
    if (currentDoc && currentTier === "premiumPlus") {
      return NextResponse.json(
        {
          error:
            "You are already on the highest catalog tier for this billing period. Manage your plan from your profile.",
        },
        { status: 400 }
      );
    }
    if (currentDoc && currentTier !== "premium") {
      return NextResponse.json(
        {
          error:
            "Your current plan is not eligible for this upgrade path. Use the pricing page instead.",
        },
        { status: 400 }
      );
    }

    const plusCandidates = plans
      .filter((p) => {
        if (!p.stripePriceId || p.stripePriceId === currentPriceId) {
          return false;
        }
        const s = toSerializedPlan(p);
        return (
          getAccessTierKey(s) === "premiumPlus" &&
          getDurationGroupKey(s) === durationKey
        );
      })
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));

    const target = plusCandidates[0];
    if (!target?.stripePriceId) {
      return NextResponse.json(
        {
          error:
            "No Premium Plus plan found for your billing period. Please contact support or use the pricing page.",
        },
        { status: 404 }
      );
    }

    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: item.id,
          price: target.stripePriceId,
        },
      ],
      cancel_at_period_end: false,
      proration_behavior: "always_invoice",
    });

    // Stripe webhooks can lag; exams UI calls `user.reload()` and needs auth metadata updated now.
    await syncUserPlanPublicMetadata(userId, {
      plan: "plus",
      planType: String(target.title ?? ""),
      planCancelled: false,
      planExpiresAt: null,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to upgrade subscription";
    console.error("upgrade-to-premium-plus:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
