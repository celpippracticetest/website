import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { captureException } from "@/lib/sentry-logger";
import { getAllowedDeviceCount } from "@/lib/accountDeviceAccess";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";

function asNonNegativeInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const plan = user.publicMetadata?.plan as string | undefined;
    const purchaseDate = user.publicMetadata?.purchaseDate as string | undefined;
    if (!hasPaidPracticeAccess(plan, purchaseDate)) {
      return NextResponse.json(
        { error: "Only paid plans can add extra devices." },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as { seats?: number };
    const seatsToAdd = Math.min(10, Math.max(1, asNonNegativeInt(body.seats, 1)));

    const currentAddons = asNonNegativeInt(user.publicMetadata?.deviceSeatAddons, 0);

    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });
    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "No Stripe customer found for this account. Contact support to add extra devices.",
          code: "stripe_customer_missing",
        },
        { status: 422 },
      );
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 20,
    });
    const subscription = subscriptions.data.find((s) =>
      ["active", "trialing", "past_due", "unpaid"].includes(s.status),
    );
    if (!subscription || !subscription.items.data[0]) {
      return NextResponse.json(
        {
          error:
            "No active Stripe subscription found for this account. Contact support to add devices.",
          code: "no_active_subscription",
        },
        { status: 422 },
      );
    }

    const item = subscription.items.data[0];
    const currentQty = Math.max(1, item.quantity ?? 1);
    const targetQty = currentQty + seatsToAdd;
    const nextAddons = Math.max(currentAddons + seatsToAdd, targetQty - 1);

    try {
      await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: item.id,
            quantity: targetQty,
          },
        ],
        // Charge the added seats immediately without redirecting to checkout.
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
        metadata: {
          ...subscription.metadata,
          user_id: userId,
          device_seat_addons: String(nextAddons),
        },
      });
    } catch (error) {
      captureException(error, {
        component: "api",
        action: "add_device_seat_stripe_update",
        userId,
      });
      return NextResponse.json(
        {
          error:
            "Could not charge extra device seats on your subscription. Please verify your payment method in billing portal.",
          code: "stripe_subscription_update_failed",
        },
        { status: 402 },
      );
    }

    const mergedPublicMetadata = {
      ...(user.publicMetadata as Record<string, unknown>),
      deviceSeatAddons: nextAddons,
      deviceSeatAddonUpdatedAt: new Date().toISOString(),
      deviceSeatAddonPlan: plan ?? "premium",
      deviceSeatChargeMode: "stripe_quantity",
    };

    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: mergedPublicMetadata,
    });

    const allowedDevices = getAllowedDeviceCount(mergedPublicMetadata);
    return NextResponse.json({
      ok: true,
      seatsAdded: seatsToAdd,
      deviceSeatAddons: nextAddons,
      allowedDevices,
      currentPlan: plan ?? "premium",
      message:
        `Added and billed ${seatsToAdd} extra ${seatsToAdd === 1 ? "device" : "devices"} ` +
        `on your ${plan ?? "premium"} plan.`,
    });
  } catch (error) {
    captureException(error, {
      component: "api",
      action: "add_device_seat",
    });
    return NextResponse.json({ error: "Failed to add device seat." }, { status: 500 });
  }
}
