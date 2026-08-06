import "server-only";

import { stripe } from "@/lib/stripe";

export type LiveStripeActiveSubscriberKeys = {
  customerIds: string[];
  userIds: string[];
  activeCount: number;
  trialingCount: number;
};

type CacheEntry = LiveStripeActiveSubscriberKeys & { at: number };

let cache: CacheEntry | null = null;
const TTL_MS = 60_000;

async function listSubscriptionsByStatus(
  status: "active" | "trialing"
): Promise<Array<{ customer: string | { id: string } | null; metadata?: Record<string, string> | null }>> {
  const out: Array<{
    customer: string | { id: string } | null;
    metadata?: Record<string, string> | null;
  }> = [];
  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.subscriptions.list({
      status,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    out.push(...page.data);
    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
    if (!startingAfter) break;
  }
  return out;
}

/**
 * Live Stripe active + trialing subscribers (cached ~60s).
 * Used by CMS user list "Plans" filter so counts match Stripe Dashboard.
 */
export async function getLiveStripeActiveSubscriberKeys(): Promise<LiveStripeActiveSubscriberKeys> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return {
      customerIds: cache.customerIds,
      userIds: cache.userIds,
      activeCount: cache.activeCount,
      trialingCount: cache.trialingCount,
    };
  }

  const [activeSubs, trialingSubs] = await Promise.all([
    listSubscriptionsByStatus("active"),
    listSubscriptionsByStatus("trialing"),
  ]);

  const customerIds = new Set<string>();
  const userIds = new Set<string>();
  for (const sub of [...activeSubs, ...trialingSubs]) {
    const customer =
      typeof sub.customer === "string"
        ? sub.customer
        : sub.customer && typeof sub.customer === "object" && "id" in sub.customer
          ? String(sub.customer.id)
          : "";
    if (customer) customerIds.add(customer);
    const uid = String(sub.metadata?.user_id || "").trim();
    if (uid) userIds.add(uid);
  }

  const next: CacheEntry = {
    at: Date.now(),
    customerIds: [...customerIds],
    userIds: [...userIds],
    activeCount: activeSubs.length,
    trialingCount: trialingSubs.length,
  };
  cache = next;
  return {
    customerIds: next.customerIds,
    userIds: next.userIds,
    activeCount: next.activeCount,
    trialingCount: next.trialingCount,
  };
}
