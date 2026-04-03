import "server-only";

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";

function formatRecurringInterval(price: Stripe.Price | undefined): string | null {
  const r = price?.recurring;
  if (!r) return null;
  const n = r.interval_count ?? 1;
  const unit = r.interval;
  if (n === 1) {
    if (unit === "month") return "Monthly";
    if (unit === "year") return "Yearly";
    if (unit === "week") return "Weekly";
    if (unit === "day") return "Daily";
  }
  if (unit === "month") return `${n} months`;
  if (unit === "year") return `${n} years`;
  if (unit === "week") return `${n} weeks`;
  if (unit === "day") return `${n} days`;
  return `${n} ${unit}`;
}

/**
 * Billing interval + tenure from Stripe (matches profile subscription resolution order).
 */
export async function getStripeSubscriptionDurationLabel(
  customerId: string
): Promise<string> {
  const billableStatuses = ["active", "trialing", "past_due", "unpaid"] as const;
  let subscription: Stripe.Subscription | null = null;

  for (const status of billableStatuses) {
    const { data } = await stripe.subscriptions.list({
      customer: customerId,
      status,
      limit: 1,
    });
    if (data[0]) {
      subscription = await stripe.subscriptions.retrieve(data[0].id);
      break;
    }
  }

  if (!subscription) {
    const anySubscription = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: "all",
    });
    if (anySubscription.data[0]) {
      subscription = await stripe.subscriptions.retrieve(
        anySubscription.data[0].id
      );
    }
  }

  if (subscription) {
    const price = subscription.items.data[0]?.price as Stripe.Price | undefined;
    const intervalLabel = formatRecurringInterval(price) || "Subscription";
    const startMs = subscription.start_date * 1000;
    const daysSubscribed = Math.max(
      0,
      Math.floor((Date.now() - startMs) / (86400 * 1000))
    );
    return `${intervalLabel} · ${daysSubscribed}d subscribed`;
  }

  const charges = await stripe.charges.list({ customer: customerId, limit: 1 });
  const latestCharge = charges.data[0];
  if (latestCharge?.status === "succeeded") {
    const startMs = latestCharge.created * 1000;
    const daysSince = Math.max(
      0,
      Math.floor((Date.now() - startMs) / (86400 * 1000))
    );
    return `One-time · ${daysSince}d since purchase`;
  }

  return "No subscription";
}

export async function getStripeSubscriptionDurationForClerkUser(
  userId: string,
  user: {
    privateMetadata?: Record<string, unknown> | null;
    emailAddresses?: { emailAddress?: string | null }[];
  }
): Promise<string> {
  try {
    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });
    if (!customerId) return "—";
    return await getStripeSubscriptionDurationLabel(customerId);
  } catch {
    return "—";
  }
}
