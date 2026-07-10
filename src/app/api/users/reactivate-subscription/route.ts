import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";

const BILLABLE_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
] as const;

function isGooglePlaySubscriber(publicMetadata: Record<string, unknown>): boolean {
  const source = String(publicMetadata.planSource ?? "").trim().toLowerCase();
  return source === "google_play" || source === "google_play_rtdn";
}

function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const end = sub.items?.data?.[0]?.current_period_end;
  return end != null ? end : null;
}

async function findBillableSubscription(
  customerId: string
): Promise<Stripe.Subscription | null> {
  for (const status of BILLABLE_STATUSES) {
    const { data } = await stripe.subscriptions.list({
      customer: customerId,
      status,
      limit: 1,
    });
    if (data[0]) {
      return data[0];
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuthenticatedRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = ctx;
  const publicMetadata = ctx.user.publicMetadata ?? {};

  if (isGooglePlaySubscriber(publicMetadata)) {
    return NextResponse.json(
      {
        error:
          "This subscription is managed through Google Play. Resubscribe from your Google Play subscription settings.",
      },
      { status: 422 }
    );
  }

  try {
    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(userId);

    const customerId = await resolveStripeCustomerId(userId, {
      stripeCustomerIdFromPrivate: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromAuthUser(user),
    });

    if (!customerId) {
      return NextResponse.json(
        { error: "Stripe customer not found" },
        { status: 422 }
      );
    }

    const subscription = await findBillableSubscription(customerId);

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No active subscription found to reactivate. Choose a plan to start a new subscription.",
        },
        { status: 422 }
      );
    }

    const updateParams: Stripe.SubscriptionUpdateParams = {
      cancel_at_period_end: false,
    };
    if (subscription.pause_collection) {
      updateParams.pause_collection = "";
    }

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      updateParams
    );

    const periodEnd = subscriptionCurrentPeriodEndUnix(updatedSubscription);

    await authAdmin.users.updateUserMetadata(userId, {
      publicMetadata: {
        planCancelled: false,
        planExpiresAt: null,
        planRenewsAt: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        subscriptionCancelledAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error: unknown) {
    console.error("Error reactivating subscription:", error);
    const message =
      error instanceof Error ? error.message : "Failed to reactivate subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
