import "server-only";

import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import { stripe } from "@/lib/stripe";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { getSql } from "@/lib/pg/pool";
import documentsClient from "@/lib/appDocumentsClient";

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

/** Writes `stripe_customer_id` to `public.user_profiles` via Supabase Postgres. */
export async function persistStripeCustomerIdForUser(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  try {
    const sql = getSql();
    if (isLikelySupabaseAuthUserId(userId)) {
      await sql`
        UPDATE public.user_profiles
        SET stripe_customer_id = ${stripeCustomerId}, updated_at = NOW()
        WHERE supabase_auth_user_id = ${userId}::uuid
          AND (stripe_customer_id IS NULL OR stripe_customer_id <> ${stripeCustomerId})
      `;
    } else {
      await sql`
        UPDATE public.user_profiles
        SET stripe_customer_id = ${stripeCustomerId}, updated_at = NOW()
        WHERE legacy_clerk_user_id = ${userId}
          AND (stripe_customer_id IS NULL OR stripe_customer_id <> ${stripeCustomerId})
      `;
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Resolves the Stripe customer ID for a user.
 * Order: user_profiles.stripe_customer_id → privateMetadata → latest checkout session → Stripe search by email.
 */
export async function resolveStripeCustomerId(
  userId: string,
  options: {
    stripeCustomerIdFromPrivate?: string | null;
    emails: readonly string[];
  }
): Promise<string | null> {
  // Tier 1: look up from user_profiles table (Supabase Postgres)
  try {
    const sql = getSql();
    const rows = await sql<{ stripe_customer_id: string | null }[]>`
      SELECT stripe_customer_id
      FROM public.user_profiles
      WHERE legacy_clerk_user_id = ${userId}
         OR (legacy_body ->> 'sub') = ${userId}
         OR supabase_auth_user_id::text = ${userId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const fromDb = rows[0]?.stripe_customer_id;
    if (typeof fromDb === "string" && fromDb.length > 0) {
      return fromDb;
    }
  } catch {
    // continue
  }

  // Tier 2: from auth metadata
  const fromPrivate = options.stripeCustomerIdFromPrivate?.trim();
  if (fromPrivate) {
    await persistStripeCustomerIdForUser(userId, fromPrivate);
    return fromPrivate;
  }

  // Tier 3: latest completed checkout session
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

  // Tier 4: Stripe customer search by email
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
