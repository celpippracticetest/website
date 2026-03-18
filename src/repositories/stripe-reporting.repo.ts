import { Db } from "mongodb";

export type StripeSubscriptionRecord = {
  stripeId: string;
  customerId: string | null;
  status: string;
  createdAt: Date;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  interval: string | null;
  intervalCount: number | null;
  couponId: string | null;
  promotionCodeId: string | null;
  dunningStatus: string | null;
  lastPaymentFailedAt: Date | null;
  metadata: Record<string, string>;
  updatedAt: Date;
};

export type StripeInvoiceRecord = {
  stripeId: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  paid: boolean;
  currency: string | null;
  createdAt: Date;
  amountPaidCents: number;
  subtotalCents: number;
  discountCents: number;
  attemptCount: number;
  hostedInvoiceUrl: string | null;
  updatedAt: Date;
};

export type StripeCustomerRecord = {
  stripeId: string;
  email: string | null;
  createdAt: Date;
  delinquent: boolean;
  metadata: Record<string, string>;
  updatedAt: Date;
};

export type StripeBalanceTransactionRecord = {
  stripeId: string;
  type: string;
  amountCents: number;
  feeCents: number;
  netCents: number;
  currency: string;
  sourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StripePriceRecord = {
  stripeId: string;
  productId: string | null;
  active: boolean;
  currency: string;
  unitAmountCents: number | null;
  interval: string | null;
  intervalCount: number | null;
  updatedAt: Date;
};

export type StripeKpis = {
  range: { startDate: string; endDate: string };
  revenue: {
    grossCents: number;
    collectedCents: number;
    discountCents: number;
    stripeFeeCents: number;
    netCents: number;
    invoiceCount: number;
  };
  subscribers: {
    currentActive: number;
    startedInPeriod: number;
    canceledInPeriod: number;
    byPlan: Array<{
      interval: string;
      intervalCount: number;
      count: number;
    }>;
  };
  churn: {
    churnedSubscribers: number;
    startingSubscribers: number;
    churnRatePercent: number;
  };
  daily: Array<{
    date: string;
    startedSubscriptions: number;
    canceledSubscriptions: number;
  }>;
  sourceFunnel: Array<{
    source: string;
    newSubscriptions: number;
    canceledSubscriptions: number;
    estimatedRevenueCents: number;
  }>;
};

const CURRENT_ACTIVE_SUBSCRIPTION_STATUSES = ["active"];

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function enumerateDayKeys(startDate: Date, endDate: Date) {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  );
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  );

  while (cursor <= end) {
    keys.push(toDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function normalizeSource(value: string | null | undefined, hasGclid?: boolean) {
  if (hasGclid) return "google_ads";
  if (!value) return "direct";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "direct";
  if (normalized === "(direct)" || normalized === "(not set)") return "direct";
  if (normalized === "google") return "google";
  return normalized;
}

export class StripeReportingRepository {
  private readonly subscriptionsCollection;
  private readonly invoicesCollection;
  private readonly customersCollection;
  private readonly balanceTransactionsCollection;
  private readonly pricesCollection;
  private readonly syncStateCollection;

  constructor(private readonly db: Db) {
    this.subscriptionsCollection = this.db.collection<StripeSubscriptionRecord>(
      "stripe_subscriptions"
    );
    this.invoicesCollection =
      this.db.collection<StripeInvoiceRecord>("stripe_invoices");
    this.customersCollection =
      this.db.collection<StripeCustomerRecord>("stripe_customers");
    this.balanceTransactionsCollection =
      this.db.collection<StripeBalanceTransactionRecord>(
        "stripe_balance_transactions"
      );
    this.pricesCollection = this.db.collection<StripePriceRecord>("stripe_prices");
    this.syncStateCollection = this.db.collection<{
      _id: string;
      lastSyncedAt?: Date;
      syncedDays?: string[];
      updatedAt: Date;
    }>("stripe_sync_state");
  }

  async ensureIndexes() {
    await Promise.all([
      this.subscriptionsCollection.createIndex({ stripeId: 1 }, { unique: true }),
      this.subscriptionsCollection.createIndex({ createdAt: 1 }),
      this.subscriptionsCollection.createIndex({ canceledAt: 1 }),
      this.subscriptionsCollection.createIndex({ status: 1 }),
      this.invoicesCollection.createIndex({ stripeId: 1 }, { unique: true }),
      this.invoicesCollection.createIndex({ createdAt: 1 }),
      this.invoicesCollection.createIndex({ paid: 1 }),
      this.customersCollection.createIndex({ stripeId: 1 }, { unique: true }),
      this.customersCollection.createIndex({ createdAt: 1 }),
      this.balanceTransactionsCollection.createIndex(
        { stripeId: 1 },
        { unique: true }
      ),
      this.balanceTransactionsCollection.createIndex({ createdAt: 1 }),
      this.pricesCollection.createIndex({ stripeId: 1 }, { unique: true }),
    ]);
  }

  async upsertSubscriptions(records: StripeSubscriptionRecord[]) {
    if (!records.length) return;
    await this.subscriptionsCollection.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { stripeId: record.stripeId },
          update: { $set: record },
          upsert: true,
        },
      }))
    );
  }

  async upsertInvoices(records: StripeInvoiceRecord[]) {
    if (!records.length) return;
    await this.invoicesCollection.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { stripeId: record.stripeId },
          update: { $set: record },
          upsert: true,
        },
      }))
    );
  }

  async upsertCustomers(records: StripeCustomerRecord[]) {
    if (!records.length) return;
    await this.customersCollection.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { stripeId: record.stripeId },
          update: { $set: record },
          upsert: true,
        },
      }))
    );
  }

  async upsertBalanceTransactions(records: StripeBalanceTransactionRecord[]) {
    if (!records.length) return;
    await this.balanceTransactionsCollection.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { stripeId: record.stripeId },
          update: { $set: record },
          upsert: true,
        },
      }))
    );
  }

  async upsertPrices(records: StripePriceRecord[]) {
    if (!records.length) return;
    await this.pricesCollection.bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { stripeId: record.stripeId },
          update: { $set: record },
          upsert: true,
        },
      }))
    );
  }

  async getLastSyncedAt() {
    const state = await this.syncStateCollection.findOne({ _id: "reporting" });
    return state?.lastSyncedAt ?? null;
  }

  async markSynced() {
    await this.syncStateCollection.updateOne(
      { _id: "reporting" },
      {
        $set: {
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  async getSyncedDays() {
    const state = await this.syncStateCollection.findOne({ _id: "reporting" });
    return new Set(state?.syncedDays ?? []);
  }

  async markDaysSynced(dayKeys: string[]) {
    if (!dayKeys.length) return;
    await this.syncStateCollection.updateOne(
      { _id: "reporting" },
      {
        $addToSet: {
          syncedDays: { $each: dayKeys },
        },
        $set: {
          updatedAt: new Date(),
        },
        $setOnInsert: {
          lastSyncedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  async getKpis(startDate: Date, endDate: Date): Promise<StripeKpis> {
    const balanceSummary = await this.balanceTransactionsCollection
      .aggregate<{ stripeFeeCents: number; netCents: number }>([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            type: { $in: ["charge", "payment", "refund", "payment_refund"] },
          },
        },
        {
          $group: {
            _id: null,
            stripeFeeCents: { $sum: "$feeCents" },
            netCents: { $sum: "$netCents" },
          },
        },
      ])
      .next();

    const getCanceledSubscribersInPeriod = async () => {
      const result = await this.subscriptionsCollection
        .aggregate<{ count: number }>([
          {
            $match: {
              canceledAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                $ifNull: ["$customerId", "$stripeId"],
              },
            },
          },
          { $count: "count" },
        ])
        .next();

      return result?.count ?? 0;
    };

    const getStartingSubscribers = async () => {
      const result = await this.subscriptionsCollection
        .aggregate<{ count: number }>([
          {
            $match: {
              createdAt: { $lt: startDate },
              $or: [{ canceledAt: null }, { canceledAt: { $gte: startDate } }],
            },
          },
          {
            $group: {
              _id: {
                $ifNull: ["$customerId", "$stripeId"],
              },
            },
          },
          { $count: "count" },
        ])
        .next();

      return result?.count ?? 0;
    };

    const [currentActive, startedInPeriod, canceledInPeriod, startingSubscribers] =
      await Promise.all([
        this.subscriptionsCollection.countDocuments({
          status: { $in: CURRENT_ACTIVE_SUBSCRIPTION_STATUSES },
          createdAt: { $lte: endDate },
          $or: [{ canceledAt: null }, { canceledAt: { $gt: endDate } }],
        }),
        this.subscriptionsCollection.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        getCanceledSubscribersInPeriod(),
        getStartingSubscribers(),
      ]);

    const byPlanRaw = await this.subscriptionsCollection
      .aggregate<{
        interval: string | null;
        intervalCount: number | null;
        count: number;
      }>([
        {
          $match: {
            status: { $in: CURRENT_ACTIVE_SUBSCRIPTION_STATUSES },
            createdAt: { $lte: endDate },
            $or: [{ canceledAt: null }, { canceledAt: { $gt: endDate } }],
          },
        },
        {
          $group: {
            _id: {
              interval: "$interval",
              intervalCount: "$intervalCount",
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            interval: "$_id.interval",
            intervalCount: "$_id.intervalCount",
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const [startedPerDay, canceledPerDay] = await Promise.all([
      this.subscriptionsCollection
        .aggregate<{ date: string; count: number }>([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, date: "$_id", count: 1 } },
        ])
        .toArray(),
      this.subscriptionsCollection
        .aggregate<{ date: string; count: number }>([
          {
            $match: {
              canceledAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$canceledAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $project: { _id: 0, date: "$_id", count: 1 } },
        ])
        .toArray(),
    ]);

    const startedMap = new Map(startedPerDay.map((item) => [item.date, item.count]));
    const canceledMap = new Map(canceledPerDay.map((item) => [item.date, item.count]));
    const dayKeys = enumerateDayKeys(startDate, endDate);
    const daily = dayKeys.map((date) => ({
      date,
      startedSubscriptions: startedMap.get(date) ?? 0,
      canceledSubscriptions: canceledMap.get(date) ?? 0,
    }));

    const churnRatePercent =
      startingSubscribers > 0
        ? Number(((canceledInPeriod / startingSubscribers) * 100).toFixed(2))
        : 0;

    const [sourceStartsRaw, sourceCancelsRaw] = await Promise.all([
      this.subscriptionsCollection
        .aggregate<{
          source: string | null;
          gclid: string | null;
          newSubscriptions: number;
          estimatedRevenueCents: number;
        }>([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $lookup: {
              from: "ga_user_attribution",
              let: { uid: "$metadata.user_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$userId", "$$uid"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    source: 1,
                    medium: 1,
                    campaign: 1,
                  },
                },
              ],
              as: "gaAttribution",
            },
          },
          {
            $lookup: {
              from: "users",
              let: { uid: "$metadata.user_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$clerkUserId", "$$uid"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    utm_source: "$publicMetadata.utm_source",
                    gclid: "$publicMetadata.gclid",
                  },
                },
              ],
              as: "userAttribution",
            },
          },
          {
            $lookup: {
              from: "stripe_prices",
              let: { pid: "$priceId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$stripeId", "$$pid"],
                    },
                  },
                },
                { $project: { _id: 0, unitAmountCents: 1 } },
              ],
              as: "priceDoc",
            },
          },
          {
            $project: {
              source: {
                $ifNull: [
                  "$metadata.utm_source",
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$gaAttribution.source", 0] },
                      { $arrayElemAt: ["$userAttribution.utm_source", 0] },
                    ],
                  },
                ],
              },
              gclid: {
                $ifNull: [
                  "$metadata.gclid",
                  { $arrayElemAt: ["$userAttribution.gclid", 0] },
                ],
              },
              priceAmount: { $arrayElemAt: ["$priceDoc.unitAmountCents", 0] },
            },
          },
          {
            $group: {
              _id: {
                source: "$source",
                gclid: "$gclid",
              },
              newSubscriptions: { $sum: 1 },
              estimatedRevenueCents: { $sum: { $ifNull: ["$priceAmount", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              source: "$_id.source",
              gclid: "$_id.gclid",
              newSubscriptions: 1,
              estimatedRevenueCents: 1,
            },
          },
        ])
        .toArray(),
      this.subscriptionsCollection
        .aggregate<{
          source: string | null;
          gclid: string | null;
          canceledSubscriptions: number;
        }>([
          {
            $match: {
              canceledAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $lookup: {
              from: "ga_user_attribution",
              let: { uid: "$metadata.user_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$userId", "$$uid"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    source: 1,
                    medium: 1,
                    campaign: 1,
                  },
                },
              ],
              as: "gaAttribution",
            },
          },
          {
            $lookup: {
              from: "users",
              let: { uid: "$metadata.user_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$clerkUserId", "$$uid"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    utm_source: "$publicMetadata.utm_source",
                    gclid: "$publicMetadata.gclid",
                  },
                },
              ],
              as: "userAttribution",
            },
          },
          {
            $project: {
              source: {
                $ifNull: [
                  "$metadata.utm_source",
                  {
                    $ifNull: [
                      { $arrayElemAt: ["$gaAttribution.source", 0] },
                      { $arrayElemAt: ["$userAttribution.utm_source", 0] },
                    ],
                  },
                ],
              },
              gclid: {
                $ifNull: [
                  "$metadata.gclid",
                  { $arrayElemAt: ["$userAttribution.gclid", 0] },
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                source: "$source",
                gclid: "$gclid",
              },
              canceledSubscriptions: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              source: "$_id.source",
              gclid: "$_id.gclid",
              canceledSubscriptions: 1,
            },
          },
        ])
        .toArray(),
    ]);

    const sourceFunnelMap = new Map<
      string,
      {
        source: string;
        newSubscriptions: number;
        canceledSubscriptions: number;
        estimatedRevenueCents: number;
      }
    >();

    for (const row of sourceStartsRaw) {
      const source = normalizeSource(row.source, Boolean(row.gclid));
      const current = sourceFunnelMap.get(source) ?? {
        source,
        newSubscriptions: 0,
        canceledSubscriptions: 0,
        estimatedRevenueCents: 0,
      };
      current.newSubscriptions += row.newSubscriptions;
      current.estimatedRevenueCents += row.estimatedRevenueCents;
      sourceFunnelMap.set(source, current);
    }

    for (const row of sourceCancelsRaw) {
      const source = normalizeSource(row.source, Boolean(row.gclid));
      const current = sourceFunnelMap.get(source) ?? {
        source,
        newSubscriptions: 0,
        canceledSubscriptions: 0,
        estimatedRevenueCents: 0,
      };
      current.canceledSubscriptions += row.canceledSubscriptions;
      sourceFunnelMap.set(source, current);
    }

    const sourceFunnel = Array.from(sourceFunnelMap.values()).sort(
      (a, b) => b.estimatedRevenueCents - a.estimatedRevenueCents
    );

    return {
      range: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      revenue: {
        grossCents: 0,
        collectedCents: 0,
        discountCents: 0,
        stripeFeeCents: balanceSummary?.stripeFeeCents ?? 0,
        netCents: balanceSummary?.netCents ?? 0,
        invoiceCount: 0,
      },
      subscribers: {
        currentActive,
        startedInPeriod,
        canceledInPeriod,
        byPlan: byPlanRaw.map((item) => ({
          interval: item.interval ?? "unknown",
          intervalCount: item.intervalCount ?? 1,
          count: item.count,
        })),
      },
      churn: {
        churnedSubscribers: canceledInPeriod,
        startingSubscribers,
        churnRatePercent,
      },
      daily,
      sourceFunnel,
    };
  }
}
