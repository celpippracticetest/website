import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  StripeReportingRepository,
  type StripeBalanceTransactionRecord,
  type StripeCustomerRecord,
  type StripePriceRecord,
  type StripeSubscriptionRecord,
} from "@/repositories/stripe-reporting.repo";

type SyncStripeReportingOptions = {
  fullSync?: boolean;
  fromDate?: Date;
  toDate?: Date;
};

type SyncStripeReportingResult = {
  syncedAt: string;
  lastSyncedAt: string | null;
  skippedDays: number;
  subscriptions: number;
  invoices: number;
  customers: number;
  balanceTransactions: number;
  prices: number;
};

function toDate(unixTimestamp?: number | null) {
  if (!unixTimestamp) return null;
  return new Date(unixTimestamp * 1000);
}

function toMetadata(metadata?: Stripe.Metadata | null): Record<string, string> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, String(value)])
  );
}

type CreatedRangeFilter = {
  gte?: number;
  lte?: number;
};

type DateRange = {
  from: Date;
  to: Date;
};

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function endOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function enumerateDayKeys(fromDate: Date, toDate: Date) {
  const keys: string[] = [];
  const cursor = startOfUtcDay(fromDate);
  const end = startOfUtcDay(toDate);
  while (cursor <= end) {
    keys.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

function buildMissingRanges(
  fromDate: Date,
  toDate: Date,
  syncedDays: Set<string>
): DateRange[] {
  const missing: DateRange[] = [];
  const start = startOfUtcDay(fromDate);
  const end = startOfUtcDay(toDate);
  let cursor = new Date(start);

  while (cursor <= end) {
    const currentKey = dayKey(cursor);
    if (syncedDays.has(currentKey)) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const rangeStart = new Date(cursor);
    let rangeEnd = new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);

    while (cursor <= end && !syncedDays.has(dayKey(cursor))) {
      rangeEnd = new Date(cursor);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    missing.push({
      from: startOfUtcDay(rangeStart),
      to: endOfUtcDay(rangeEnd),
    });
  }

  return missing;
}

export async function syncStripeReportingData(
  repo: StripeReportingRepository,
  options: SyncStripeReportingOptions = {}
): Promise<SyncStripeReportingResult> {
  const now = new Date();
  const hasRange = Boolean(options.fromDate || options.toDate);
  const rangeFrom = options.fromDate
    ? Math.floor(options.fromDate.getTime() / 1000)
    : null;
  const rangeTo = options.toDate
    ? Math.floor(options.toDate.getTime() / 1000)
    : Math.floor(now.getTime() / 1000);

  const lastSyncedAt =
    options.fullSync || hasRange ? null : await repo.getLastSyncedAt();
  const sinceUnix = lastSyncedAt
    ? Math.floor(lastSyncedAt.getTime() / 1000)
    : null;

  let skippedDays = 0;

  let subscriptionsCount = 0;
  let invoicesCount = 0;
  let customersCount = 0;
  let balanceTransactionsCount = 0;
  let pricesCount = 0;

  const syncWindow = async (createdFilter?: CreatedRangeFilter) => {
    let subscriptionCursor: string | undefined;
    while (true) {
      const page = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        ...(createdFilter ? { created: createdFilter } : {}),
        ...(subscriptionCursor ? { starting_after: subscriptionCursor } : {}),
      });

      const records: StripeSubscriptionRecord[] = page.data.map((subscription) => {
        const subAny = subscription as any;
        const firstPrice = subscription.items.data[0]?.price;
        const discountObject = subAny?.discount || null;
        const couponId =
          discountObject?.coupon?.id ||
          (typeof discountObject?.coupon === "string"
            ? discountObject.coupon
            : null);
        const promotionCodeId =
          discountObject?.promotion_code?.id ||
          (typeof discountObject?.promotion_code === "string"
            ? discountObject.promotion_code
            : null);
        const dunningStatus =
          subscription.status === "past_due" ||
          subscription.status === "unpaid" ||
          subscription.status === "incomplete_expired"
            ? subscription.status
            : null;
        const lastPaymentFailedAt = toDate(subAny?.metadata?.last_payment_failed_at_unix);
        return {
          stripeId: subscription.id,
          customerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer?.id || null,
          status: subscription.status,
          createdAt: new Date(subscription.created * 1000),
          currentPeriodStartAt: toDate(subAny.current_period_start),
          currentPeriodEndAt: toDate(subAny.current_period_end),
          canceledAt: toDate(subscription.canceled_at),
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          priceId: firstPrice?.id || null,
          interval: firstPrice?.recurring?.interval || null,
          intervalCount: firstPrice?.recurring?.interval_count || null,
          couponId,
          promotionCodeId,
          dunningStatus,
          lastPaymentFailedAt,
          metadata: toMetadata(subscription.metadata),
          updatedAt: now,
        };
      });

      await repo.upsertSubscriptions(records);
      subscriptionsCount += records.length;

      if (!page.has_more || page.data.length === 0) break;
      subscriptionCursor = page.data[page.data.length - 1].id;
    }

    let customerCursor: string | undefined;
    while (true) {
      const page = await stripe.customers.list({
        limit: 100,
        ...(createdFilter ? { created: createdFilter } : {}),
        ...(customerCursor ? { starting_after: customerCursor } : {}),
      });

      const records: StripeCustomerRecord[] = page.data.map((customer) => ({
        stripeId: customer.id,
        email: customer.email || null,
        createdAt: new Date(customer.created * 1000),
        delinquent: Boolean(customer.delinquent),
        metadata: toMetadata(customer.metadata),
        updatedAt: now,
      }));

      await repo.upsertCustomers(records);
      customersCount += records.length;

      if (!page.has_more || page.data.length === 0) break;
      customerCursor = page.data[page.data.length - 1].id;
    }

    let balanceTxCursor: string | undefined;
    while (true) {
      const page = await stripe.balanceTransactions.list({
        limit: 100,
        ...(createdFilter ? { created: createdFilter } : {}),
        ...(balanceTxCursor ? { starting_after: balanceTxCursor } : {}),
      });

      const records: StripeBalanceTransactionRecord[] = page.data.map((tx) => ({
        stripeId: tx.id,
        type: tx.type,
        amountCents: tx.amount,
        feeCents: tx.fee,
        netCents: tx.net,
        currency: tx.currency,
        sourceId: typeof tx.source === "string" ? tx.source : tx.source?.id || null,
        createdAt: new Date(tx.created * 1000),
        updatedAt: now,
      }));

      await repo.upsertBalanceTransactions(records);
      balanceTransactionsCount += records.length;

      if (!page.has_more || page.data.length === 0) break;
      balanceTxCursor = page.data[page.data.length - 1].id;
    }
  };

  if (hasRange && options.fromDate && options.toDate) {
    const syncedDays = await repo.getSyncedDays();
    const allRequestedDays = enumerateDayKeys(options.fromDate, options.toDate);
    const missingRanges = buildMissingRanges(options.fromDate, options.toDate, syncedDays);
    skippedDays = allRequestedDays.length - missingRanges.reduce((sum, range) => {
      return sum + enumerateDayKeys(range.from, range.to).length;
    }, 0);

    for (const range of missingRanges) {
      await syncWindow({
        gte: Math.floor(range.from.getTime() / 1000),
        lte: Math.floor(range.to.getTime() / 1000),
      });
    }

    if (allRequestedDays.length) {
      await repo.markDaysSynced(allRequestedDays);
    }
  } else {
    const createdFilter = sinceUnix ? { gte: sinceUnix } : undefined;
    await syncWindow(createdFilter);
  }

  let priceCursor: string | undefined;
  while (true) {
    const page = await stripe.prices.list({
      limit: 100,
      ...(priceCursor ? { starting_after: priceCursor } : {}),
    });

    const records: StripePriceRecord[] = page.data.map((price) => ({
      stripeId: price.id,
      productId: typeof price.product === "string" ? price.product : null,
      active: Boolean(price.active),
      currency: price.currency,
      unitAmountCents: price.unit_amount ?? null,
      interval: price.recurring?.interval || null,
      intervalCount: price.recurring?.interval_count || null,
      updatedAt: now,
    }));

    await repo.upsertPrices(records);
    pricesCount += records.length;

    if (!page.has_more || page.data.length === 0) break;
    priceCursor = page.data[page.data.length - 1].id;
  }

  await repo.markSynced();

  return {
    syncedAt: now.toISOString(),
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
    skippedDays,
    subscriptions: subscriptionsCount,
    invoices: invoicesCount,
    customers: customersCount,
    balanceTransactions: balanceTransactionsCount,
    prices: pricesCount,
  };
}
