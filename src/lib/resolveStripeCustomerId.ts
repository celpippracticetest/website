import "server-only";

import mongoClient from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import { CheckoutRepository } from "@/repositories/checkout.repo";

export function emailsFromClerkUser(user: {
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

/** Writes `stripeCustomerId` on MongoDB `users` (by `clerkUserId`). */
export async function persistStripeCustomerIdToMongo(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  if (!mongoClient) return;
  try {
    await mongoClient.db().collection("users").updateOne(
      { clerkUserId: userId },
      {
        $set: { stripeCustomerId, updatedAt: new Date() },
        $setOnInsert: { clerkUserId: userId, createdAt: new Date() },
      },
      { upsert: true }
    );
  } catch {
    // Non-fatal: resolution still succeeded for this request.
  }
}

/**
 * Stripe customer id for a Clerk user — not only Clerk privateMetadata.
 * Order: MongoDB `users.stripeCustomerId`, Clerk `privateMetadata.stripeCustomerId`,
 * latest completed checkout session, then Stripe customer search by email.
 * Newly resolved ids are written to MongoDB for later requests.
 */
export async function resolveStripeCustomerId(
  userId: string,
  options: {
    clerkStripeCustomerId?: string | null;
    emails: readonly string[];
  }
): Promise<string | null> {
  if (mongoClient) {
    try {
      const doc = await mongoClient
        .db()
        .collection("users")
        .findOne({ clerkUserId: userId }, { projection: { stripeCustomerId: 1 } });
      const fromDb = doc?.stripeCustomerId;
      if (typeof fromDb === "string" && fromDb.length > 0) {
        return fromDb;
      }
    } catch {
      // continue
    }
  }

  const fromClerk = options.clerkStripeCustomerId?.trim();
  if (fromClerk) {
    await persistStripeCustomerIdToMongo(userId, fromClerk);
    return fromClerk;
  }

  if (mongoClient) {
    try {
      const checkoutRepo = new CheckoutRepository(mongoClient);
      const lastCheckout = await checkoutRepo.findLatestCheckoutByUserId(userId);
      if (lastCheckout) {
        const session = await stripe.checkout.sessions.retrieve(
          lastCheckout.checkoutId
        );
        const cid =
          typeof session.customer === "string" ? session.customer : null;
        if (cid) {
          await persistStripeCustomerIdToMongo(userId, cid);
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
        await persistStripeCustomerIdToMongo(userId, cid);
        return cid;
      }
    } catch {
      // try next email
    }
  }

  return null;
}
