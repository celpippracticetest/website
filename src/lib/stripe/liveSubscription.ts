import "server-only";

import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

/** Active or trialing only — canceled / unpaid history is not a current plan. */
export async function findLiveStripeSubscription(
  customerId: string,
): Promise<Stripe.Subscription | null> {
  const id = customerId.trim();
  if (!id) return null;
  const [active, trialing] = await Promise.all([
    stripe.subscriptions.list({
      customer: id,
      status: "active",
      limit: 1,
    }),
    stripe.subscriptions.list({
      customer: id,
      status: "trialing",
      limit: 1,
    }),
  ]);
  return active.data[0] ?? trialing.data[0] ?? null;
}

export async function findLiveStripeCustomerId(
  customerIds: readonly string[],
): Promise<string | null> {
  for (const customerId of customerIds) {
    const live = await findLiveStripeSubscription(customerId);
    if (live) return customerId;
  }
  return null;
}
