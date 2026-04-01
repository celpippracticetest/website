import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newPriceId } = await req.json();
    if (!newPriceId) {
      return NextResponse.json(
        { error: "New Price ID is required" },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });

    if (!customerId) {
      return NextResponse.json(
        {
          error: "Stripe customer not found",
          code: "stripe_customer_missing",
        },
        { status: 422 }
      );
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 20,
    });

    const subscription = subscriptions.data.find((s: Stripe.Subscription) =>
      ["active", "trialing", "past_due", "unpaid"].includes(s.status)
    );

    if (!subscription) {
      return NextResponse.json(
        {
          error: "No active subscription found",
          code: "no_active_subscription",
        },
        { status: 422 }
      );
    }
    const subscriptionItemId = subscription.items.data[0].id;

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        cancel_at_period_end: false,
        proration_behavior: "always_invoice", // Charge/credit immediately? Or use "create_prorations" (default)
        // Using "always_invoice" calculates proration and attempts to invoice immediately. 
        // "create_prorations" (default) adds proration line items to the next invoice.
        // For immediate plan change, usually we want to invoice immediately if it's an upgrade, but Stripe handles proration.
        // Let's stick to default or specific behavior. 
        // "always_invoice" is safer to ensure payment is collected if upgrading.
      }
    );
    
    // Update user metadata to reflect new plan name if possible, or just rely on webhook.
    // We can fetch the product details to update the plan name in metadata for immediate UI feedback.
    
    // Note: We are relying on Stripe Webhook to update the user metadata permanently.
    // But we can update it optimistically or wait. 
    // Ideally, the webhook handles it.

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription,
    });
  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update subscription" },
      { status: 500 }
    );
  }
}
