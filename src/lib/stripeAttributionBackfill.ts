import { getDb } from "@/lib/appDocumentsClient";
import { stripe } from "@/lib/stripe";
import {
  buildChargeAttributionMetadata,
  extractUserAttributionSources,
  hasGoogleClickAttribution,
  mergeAttributionIntoStripeMetadata,
  resolvePaymentIntentId,
  stampPaymentIntentAttribution,
  userHasStoredAttribution,
} from "@/lib/stripeChargeAttribution";

export type StripeAttributionBackfillOptions = {
  limit?: number;
  dryRun?: boolean;
  invoiceLimitPerCustomer?: number;
  requireGoogleClickId?: boolean;
};

export type StripeAttributionBackfillUserResult = {
  userId: string;
  stripeCustomerId: string | null;
  skippedReason?: string;
  subscriptionsUpdated: number;
  chargesUpdated: number;
};

export type StripeAttributionBackfillResult = {
  ok: true;
  dryRun: boolean;
  scanned: number;
  processed: number;
  skipped: number;
  subscriptionsUpdated: number;
  chargesUpdated: number;
  results: StripeAttributionBackfillUserResult[];
};

function resolveUserId(user: Record<string, unknown>): string | null {
  const candidates = [user.clerkUserId, user.supabaseUserId, user.sub, user._id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === "object" && "toString" in candidate) {
      const asString = String(candidate);
      if (asString.trim()) return asString.trim();
    }
  }
  return null;
}

function resolveStripeCustomerId(user: Record<string, unknown>): string | null {
  const direct = readTrimmedString(user.stripeCustomerId);
  if (direct) return direct;

  const privateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;
  return readTrimmedString(privateMetadata.stripeCustomerId) ?? null;
}

function readTrimmedString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function backfillCustomerStripeObjects(
  customerId: string,
  sources: Record<string, unknown>,
  args: { dryRun: boolean; invoiceLimitPerCustomer: number }
): Promise<{ subscriptionsUpdated: number; chargesUpdated: number }> {
  let subscriptionsUpdated = 0;
  let chargesUpdated = 0;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  for (const subscription of subscriptions.data) {
    if (hasGoogleClickAttribution(subscription.metadata)) continue;

    const merged = mergeAttributionIntoStripeMetadata(subscription.metadata, sources);
    if (JSON.stringify(merged) === JSON.stringify(subscription.metadata)) continue;

    if (!args.dryRun) {
      await stripe.subscriptions.update(subscription.id, { metadata: merged });
    }
    subscriptionsUpdated += 1;
  }

  const invoices = await stripe.invoices.list({
    customer: customerId,
    status: "paid",
    limit: args.invoiceLimitPerCustomer,
  });

  for (const invoice of invoices.data) {
    const paymentIntentId = resolvePaymentIntentId(invoice.payment_intent as string | null);
    if (!paymentIntentId) continue;

    let existingMetadata: Record<string, string> = {};
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      existingMetadata = (paymentIntent.metadata ?? {}) as Record<string, string>;
    } catch {
      continue;
    }

    if (hasGoogleClickAttribution(existingMetadata)) continue;

    const merged = mergeAttributionIntoStripeMetadata(existingMetadata, sources);
    if (JSON.stringify(merged) === JSON.stringify(existingMetadata)) continue;

    if (!args.dryRun) {
      await stampPaymentIntentAttribution(paymentIntentId, merged, {
        attribution_backfill: "true",
        ...(invoice.id ? { invoice_id: invoice.id } : {}),
      });
    }
    chargesUpdated += 1;
  }

  return { subscriptionsUpdated, chargesUpdated };
}

export async function backfillStripeAttributionForUser(
  user: Record<string, unknown>,
  options: Pick<
    StripeAttributionBackfillOptions,
    "dryRun" | "invoiceLimitPerCustomer" | "requireGoogleClickId"
  > = {}
): Promise<StripeAttributionBackfillUserResult> {
  const dryRun = options.dryRun === true;
  const invoiceLimitPerCustomer = options.invoiceLimitPerCustomer ?? 24;
  const requireGoogleClickId = options.requireGoogleClickId !== false;

  const userId = resolveUserId(user);
  if (!userId) {
    return {
      userId: "unknown",
      stripeCustomerId: null,
      skippedReason: "missing_user_id",
      subscriptionsUpdated: 0,
      chargesUpdated: 0,
    };
  }

  const sources = extractUserAttributionSources(user, userId);
  if (!userHasStoredAttribution(sources)) {
    return {
      userId,
      stripeCustomerId: resolveStripeCustomerId(user) ?? null,
      skippedReason: "no_stored_attribution",
      subscriptionsUpdated: 0,
      chargesUpdated: 0,
    };
  }

  const chargeMetadata = buildChargeAttributionMetadata(sources);
  if (
    requireGoogleClickId &&
    !readTrimmedString(chargeMetadata.gclid) &&
    !readTrimmedString(chargeMetadata.gbraid) &&
    !readTrimmedString(chargeMetadata.wbraid)
  ) {
    return {
      userId,
      stripeCustomerId: resolveStripeCustomerId(user) ?? null,
      skippedReason: "no_google_click_id",
      subscriptionsUpdated: 0,
      chargesUpdated: 0,
    };
  }

  const stripeCustomerId = resolveStripeCustomerId(user);
  if (!stripeCustomerId) {
    return {
      userId,
      stripeCustomerId: null,
      skippedReason: "missing_stripe_customer_id",
      subscriptionsUpdated: 0,
      chargesUpdated: 0,
    };
  }

  const { subscriptionsUpdated, chargesUpdated } = await backfillCustomerStripeObjects(
    stripeCustomerId,
    sources,
    { dryRun, invoiceLimitPerCustomer }
  );

  return {
    userId,
    stripeCustomerId,
    subscriptionsUpdated,
    chargesUpdated,
  };
}

export async function runStripeAttributionBackfill(
  options: StripeAttributionBackfillOptions = {}
): Promise<StripeAttributionBackfillResult> {
  const limit = Math.max(1, Math.min(options.limit ?? 50, 500));
  const dryRun = options.dryRun === true;
  const db = await getDb();

  const candidates = await db
    .collection("users")
    .find({
      $or: [
        { "publicMetadata.gclid": { $exists: true, $nin: [null, ""] } },
        { "publicMetadata.gbraid": { $exists: true, $nin: [null, ""] } },
        { "publicMetadata.wbraid": { $exists: true, $nin: [null, ""] } },
        {
          "publicMetadata.clerk_public_metadata.gclid": {
            $exists: true,
            $nin: [null, ""],
          },
        },
        {
          "publicMetadata.clerk_public_metadata.gbraid": {
            $exists: true,
            $nin: [null, ""],
          },
        },
        {
          "publicMetadata.clerk_public_metadata.wbraid": {
            $exists: true,
            $nin: [null, ""],
          },
        },
        { "attribution.firstTouch.gclid": { $exists: true, $nin: [null, ""] } },
        { "attribution.lastTouch.gclid": { $exists: true, $nin: [null, ""] } },
        {
          "attribution.firstTouch.googleAdsCampaignId": {
            $exists: true,
            $nin: [null, ""],
          },
        },
        {
          "attribution.lastTouch.googleAdsCampaignId": {
            $exists: true,
            $nin: [null, ""],
          },
        },
      ],
      $and: [
        {
          $or: [
            { stripeCustomerId: { $exists: true, $nin: [null, ""] } },
            { "privateMetadata.stripeCustomerId": { $exists: true, $nin: [null, ""] } },
          ],
        },
      ],
    })
    .limit(limit)
    .toArray();

  const results: StripeAttributionBackfillUserResult[] = [];
  let processed = 0;
  let skipped = 0;
  let subscriptionsUpdated = 0;
  let chargesUpdated = 0;

  for (const user of candidates) {
    const result = await backfillStripeAttributionForUser(
      user as Record<string, unknown>,
      {
        dryRun,
        invoiceLimitPerCustomer: options.invoiceLimitPerCustomer,
        requireGoogleClickId: options.requireGoogleClickId,
      }
    );
    results.push(result);

    if (result.skippedReason) {
      skipped += 1;
      continue;
    }

    processed += 1;
    subscriptionsUpdated += result.subscriptionsUpdated;
    chargesUpdated += result.chargesUpdated;
  }

  return {
    ok: true,
    dryRun,
    scanned: candidates.length,
    processed,
    skipped,
    subscriptionsUpdated,
    chargesUpdated,
    results,
  };
}
