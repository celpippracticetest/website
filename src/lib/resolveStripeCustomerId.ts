import "server-only";

import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import documentsClient from "@/lib/appDocumentsClient";
import { stripe } from "@/lib/stripe";
import { CheckoutRepository } from "@/repositories/checkout.repo";

export function emailsFromAuthUser(user: {
  emailAddresses?: { emailAddress?: string | null }[];
}): string[] {
  return normalizeEmails(
    (user.emailAddresses ?? []).map((e) => e?.emailAddress ?? "")
  );
}

function normalizeEmails(emails: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of emails) {
    const e = raw.trim().toLowerCase();
    if (e.length > 0) out.add(e);
  }
  return [...out];
}

function userIdAppDocFilter(userId: string): Record<string, unknown> {
  if (isLikelySupabaseAuthUserId(userId)) {
    return { supabaseUserId: userId };
  }
  return { clerkUserId: userId };
}

/** Writes `stripeCustomerId` on the `users` document (by legacy external id or Supabase id). */
export async function persistStripeCustomerIdForUser(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  if (!documentsClient) return;
  try {
    const filter = userIdAppDocFilter(userId);
    const insertKey =
      "supabaseUserId" in filter
        ? { supabaseUserId: userId }
        : { clerkUserId: userId };
    await documentsClient.db().collection("users").updateOne(
      filter,
      {
        $set: { stripeCustomerId, updatedAt: new Date() },
        $setOnInsert: { ...insertKey, createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch {
    // Non-fatal: resolution still succeeded for this request.
  }
}

/**
 * Stripe customer id for a user — not only `privateMetadata.stripeCustomerId`.
 * Order: `users.stripeCustomerId`, `privateMetadata.stripeCustomerId`,
 * latest completed checkout session, then Stripe customer search by email.
 * Newly resolved ids are written to `users` for later requests.
 */
export async function resolveStripeCustomerId(
  userId: string,
  options: {
    stripeCustomerIdFromPrivate?: string | null;
    emails: readonly string[];
  }
): Promise<string | null> {
  if (documentsClient) {
    try {
      const doc = await documentsClient
        .db()
        .collection("users")
        .findOne(
          {
            $or: [{ clerkUserId: userId }, { supabaseUserId: userId }],
          },
          { projection: { stripeCustomerId: 1 } }
        );
      const fromDb = doc?.stripeCustomerId;
      if (typeof fromDb === "string" && fromDb.length > 0) {
        return fromDb;
      }
    } catch {
      // continue
    }
  }

  const fromPrivate = options.stripeCustomerIdFromPrivate?.trim();
  if (fromPrivate) {
    await persistStripeCustomerIdForUser(userId, fromPrivate);
    return fromPrivate;
  }

  if (documentsClient) {
    try {
      const checkoutRepo = new CheckoutRepository(documentsClient);
      const lastCheckout = await checkoutRepo.findLatestCheckoutByUserId(userId);
      if (lastCheckout) {
        const session = await stripe.checkout.sessions.retrieve(
          lastCheckout.checkoutId
        );
        const cid =
          typeof session.customer === "string" ? session.customer : null;
        if (cid) {
          await persistStripeCustomerIdForUser(userId, cid);
          return cid;
        }
      }
    } catch {
      // continue
    }
  }

  for (const email of normalizeEmails(options.emails)) {
    try {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        const cid = customers.data[0].id;
        await persistStripeCustomerIdForUser(userId, cid);
        return cid;
      }
    } catch {
      // try next email
    }
  }

  return null;
}
