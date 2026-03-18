import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import { StripeReportingRepository } from "@/repositories/stripe-reporting.repo";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";

const formatDateForGa4 = (date: Date) => date.toISOString().slice(0, 10);
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API_BASE_URL = "https://googleads.googleapis.com/v18";

let googleAdsAccessToken = "";
let googleAdsAccessTokenExpiresAt = 0;

type GoogleAdsApiConfig = {
  customerId: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  loginCustomerId?: string;
};

type GoogleAdsRowMetric = {
  costMicros?: string | number;
  cost_micros?: string | number;
  costMicrosValue?: string | number;
  clicks?: string | number;
  impressions?: string | number;
  conversions?: string | number;
};

type GoogleAdsApiRow = {
  campaign?: {
    id?: string | number;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    advertising_channel_type?: string;
  };
  metrics?: GoogleAdsRowMetric;
  segments?: {
    date?: string;
  };
};

type GoogleAdsCampaignPerformance = {
  campaignId: string;
  campaignName: string;
  status: string;
  channelType: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
};

const getGoogleAdsApiConfig = (): GoogleAdsApiConfig | null => {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.trim();
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  const clientId =
    process.env.GOOGLE_ADS_CLIENT_ID?.trim() ||
    process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret =
    process.env.GOOGLE_ADS_CLIENT_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken =
    process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim() ||
    process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.trim();

  if (!customerId || !developerToken || !clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return {
    customerId: customerId.replace(/-/g, ""),
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    loginCustomerId: loginCustomerId ? loginCustomerId.replace(/-/g, "") : undefined,
  };
};

const isGoogleAdsTokenExpired = () =>
  !googleAdsAccessToken || Date.now() >= googleAdsAccessTokenExpiresAt - 60_000;

const refreshGoogleAdsAccessToken = async (config: GoogleAdsApiConfig) => {
  const tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    throw new Error(
      `Google Ads token refresh failed: ${tokenPayload?.error || tokenResponse.status}`
    );
  }

  googleAdsAccessToken = String(tokenPayload.access_token);
  googleAdsAccessTokenExpiresAt =
    Date.now() + Number(tokenPayload.expires_in || 3600) * 1000;
  return googleAdsAccessToken;
};

const getGoogleAdsAccessToken = async (config: GoogleAdsApiConfig) => {
  if (isGoogleAdsTokenExpired()) {
    await refreshGoogleAdsAccessToken(config);
  }
  return googleAdsAccessToken;
};

const parseGoogleAdsNumber = (value: string | number | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getGoogleAdsMetricMicros = (metrics?: GoogleAdsRowMetric) =>
  parseGoogleAdsNumber(
    metrics?.costMicros ?? metrics?.cost_micros ?? metrics?.costMicrosValue
  );

const runGoogleAdsSearchStream = async (
  config: GoogleAdsApiConfig,
  query: string
): Promise<GoogleAdsApiRow[]> => {
  const accessToken = await getGoogleAdsAccessToken(config);
  const response = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/customers/${config.customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "developer-token": config.developerToken,
        ...(config.loginCustomerId
          ? { "login-customer-id": config.loginCustomerId }
          : {}),
      },
      body: JSON.stringify({ query }),
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `Google Ads API request failed: ${
        (payload as { error?: { message?: string } } | null)?.error?.message ||
        response.status
      }`
    );
  }

  const streamRows = Array.isArray(payload)
    ? (payload as Array<{ results?: GoogleAdsApiRow[] }>)
    : [];

  return streamRows.flatMap((chunk) =>
    Array.isArray(chunk?.results) ? chunk.results : []
  );
};

const getGoogleAdsCostFromApi = async (
  from: Date,
  to: Date
): Promise<number | null> => {
  const config = getGoogleAdsApiConfig();
  if (!config) return null;

  try {
    const dateFrom = formatDateForGa4(from);
    const dateTo = formatDateForGa4(to);
    const query = `
      SELECT metrics.cost_micros
      FROM customer
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    `;
    const results = await runGoogleAdsSearchStream(config, query);
    const totalCostMicros = results.reduce(
      (sum, row) => sum + getGoogleAdsMetricMicros(row.metrics),
      0
    );

    return totalCostMicros / 1_000_000;
  } catch (error) {
    console.error("Google Ads API cost fetch failed:", error);
    return null;
  }
};

const getGa4Client = () => {
  const ga4PropertyId = process.env.GA4_PROPERTY_ID;
  const analyticsClientEmail =
    process.env.ANALYTICS_CLIENT_EMAIL || process.env.ANALYTICS_CLIENT_ID;
  const analyticsPrivateKey = process.env.ANALYTICS_PRIVATE_KEY;

  if (!ga4PropertyId?.trim()) {
    return null;
  }

  if (!analyticsClientEmail?.trim() || !analyticsPrivateKey?.trim()) {
    return null;
  }

  const privateKey = analyticsPrivateKey
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (
    !privateKey.includes("-----BEGIN") ||
    !privateKey.includes("-----END")
  ) {
    return null;
  }

  const authClient = new JWT({
    email: analyticsClientEmail.trim(),
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });

  return {
    propertyId: `properties/${ga4PropertyId}`,
    client: new BetaAnalyticsDataClient({ authClient }),
  };
};

const getGoogleAdsCost = async (from: Date, to: Date) => {
  const adsApiCost = await getGoogleAdsCostFromApi(from, to);
  if (adsApiCost !== null) {
    return adsApiCost;
  }

  const ga4 = getGa4Client();
  if (!ga4) return 0;

  try {
    const dateRange = {
      startDate: formatDateForGa4(from),
      endDate: formatDateForGa4(to),
    };
    const metricCandidates = [
      // Match GA4 UI labels first ("Google Ads cost").
      "googleAdsCost",
      // Fallback candidates depending on property/reporting compatibility.
      "advertiserAdCost",
      "totalAdvertisingCost",
    ] as const;

    for (const metricName of metricCandidates) {
      try {
        const [response] = await ga4.client.runReport({
          property: ga4.propertyId,
          dateRanges: [dateRange],
          dimensions: [{ name: "date" }],
          metrics: [{ name: metricName }],
        });

        const totalCost =
          response.rows?.reduce((sum, row) => {
            const value = Number.parseFloat(
              row.metricValues?.[0]?.value ?? "0"
            );
            return Number.isFinite(value) ? sum + value : sum;
          }, 0) ?? 0;

        if (totalCost > 0) {
          return totalCost;
        }
      } catch (metricError) {
        console.warn(
          `GA4 metric unavailable for Google Ads cost: ${metricName}`,
          metricError
        );
      }
    }

    return 0;
  } catch (error) {
    console.error("GA4 Google Ads cost fetch failed:", error);
    return 0;
  }
};

const getGoogleAdsCostByDay = async (
  from: Date,
  to: Date
): Promise<Map<string, number>> => {
  const config = getGoogleAdsApiConfig();
  if (config) {
    try {
      const dateFrom = formatDateForGa4(from);
      const dateTo = formatDateForGa4(to);
      const query = `
        SELECT segments.date, metrics.cost_micros
        FROM customer
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      `;
      const results = await runGoogleAdsSearchStream(config, query);
      const map = new Map<string, number>();
      for (const row of results) {
        const date = String(row?.segments?.date || "");
        if (!date) continue;
        const cost = getGoogleAdsMetricMicros(row.metrics) / 1_000_000;
        if (Number.isFinite(cost)) {
          map.set(date, (map.get(date) ?? 0) + cost);
        }
      }
      return map;
    } catch (error) {
      console.error("Google Ads daily cost fetch failed:", error);
    }
  }

  const ga4 = getGa4Client();
  if (!ga4) return new Map<string, number>();

  const dateRange = {
    startDate: formatDateForGa4(from),
    endDate: formatDateForGa4(to),
  };
  const metricCandidates = [
    "googleAdsCost",
    "advertiserAdCost",
    "totalAdvertisingCost",
  ] as const;

  for (const metricName of metricCandidates) {
    try {
      const [response] = await ga4.client.runReport({
        property: ga4.propertyId,
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [{ name: metricName }],
      });

      const map = new Map<string, number>();
      for (const row of response.rows ?? []) {
        const key = row.dimensionValues?.[0]?.value;
        const value = Number.parseFloat(row.metricValues?.[0]?.value ?? "0");
        if (!key) continue;
        const normalized = `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
        map.set(normalized, Number.isFinite(value) ? value : 0);
      }
      return map;
    } catch (metricError) {
      console.warn(
        `GA4 metric unavailable for daily Google Ads cost: ${metricName}`,
        metricError
      );
    }
  }

  return new Map<string, number>();
};

const getGoogleAdsCampaignPerformance = async (
  from: Date,
  to: Date
): Promise<GoogleAdsCampaignPerformance[]> => {
  const config = getGoogleAdsApiConfig();
  if (!config) return [];

  try {
    const dateFrom = formatDateForGa4(from);
    const dateTo = formatDateForGa4(to);
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ORDER BY metrics.cost_micros DESC
    `;
    const rows = await runGoogleAdsSearchStream(config, query);

    return rows
      .map((row) => {
        const campaignId = String(row.campaign?.id ?? "").trim();
        const campaignName = String(row.campaign?.name ?? "").trim();
        const impressions = parseGoogleAdsNumber(row.metrics?.impressions);
        const clicks = parseGoogleAdsNumber(row.metrics?.clicks);
        const conversions = parseGoogleAdsNumber(row.metrics?.conversions);
        const cost = getGoogleAdsMetricMicros(row.metrics) / 1_000_000;

        if (!campaignId || !campaignName) return null;

        return {
          campaignId,
          campaignName,
          status: String(row.campaign?.status ?? "UNSPECIFIED"),
          channelType: String(
            row.campaign?.advertisingChannelType ??
              row.campaign?.advertising_channel_type ??
              "UNSPECIFIED"
          ),
          cost: Number(cost.toFixed(2)),
          clicks,
          impressions,
          conversions: Number(conversions.toFixed(2)),
          ctr:
            impressions > 0
              ? Number(((clicks / impressions) * 100).toFixed(2))
              : 0,
          averageCpc:
            clicks > 0 ? Number((cost / clicks).toFixed(2)) : 0,
        } satisfies GoogleAdsCampaignPerformance;
      })
      .filter(
        (campaign): campaign is GoogleAdsCampaignPerformance =>
          campaign !== null && campaign.cost > 0
      );
  } catch (error) {
    console.error("Google Ads campaign performance fetch failed:", error);
    return [];
  }
};

type ClvStats = {
  customerLifetimeValue: number;
  averageSubscriptionDurationDays: number;
};

type DailyTrendPoint = {
  date: string;
  newUsers: number;
  newSubscriptions: number;
  activeSubscribers: number;
  cancelledSubscribers: number;
  revenue: number;
  googleAdsCost: number;
};

type ReportPayload = {
  newUsers: {
    current: number;
    previous: number;
    change: number;
  };
  newSubscriptions: {
    current: number;
    previous: number;
    change: number;
  };
  activeSubscribers: {
    current: number;
    previous: number;
    change: number;
  };
  cancelledSubscribers: {
    current: number;
    previous: number;
    change: number;
  };
  revenue: {
    current: number;
    previous: number;
    change: number;
  };
  googleAdsCost: {
    current: number;
    previous: number;
    change: number;
  };
  customerLifetimeValue: {
    current: number;
    previous: number;
    change: number;
  };
  averageSubscriptionDurationDays: {
    current: number;
    previous: number;
    change: number;
  };
  dailyTrends: DailyTrendPoint[];
  googleAdsCampaigns: GoogleAdsCampaignPerformance[];
};

const toDayKey = (date: Date) => date.toISOString().slice(0, 10);

const enumerateDayKeys = (start: Date, end: Date) => {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const endDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  );
  while (cursor <= endDay) {
    keys.push(toDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
};

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveSubscriptionDurationDays(user: any, now: Date): number {
  const persisted = Number(user?.subscriptionDurationDays || 0);
  if (persisted > 0) return persisted;

  const startDate =
    normalizeDate(user?.subscriptionStartDate) ||
    normalizeDate(user?.publicMetadata?.purchaseDate);
  if (!startDate) return 0;

  const endDate = resolveSubscriptionEndDate(user, now, startDate);
  if (!endDate) return 0;

  return Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function resolveSubscriptionEndDate(user: any, now: Date, startDate: Date): Date | null {
  const explicitEndDate = normalizeDate(user?.subscriptionEndDate);
  if (explicitEndDate) return explicitEndDate;

  const plan = String(user?.plan || "free").toLowerCase();
  const isActivePlan =
    plan === "premium" || plan === "pro" || plan === "enterprise";
  if (isActivePlan) return now;

  const persistedDuration = Number(user?.subscriptionDurationDays || 0);
  if (persistedDuration > 0) {
    return new Date(startDate.getTime() + persistedDuration * 24 * 60 * 60 * 1000);
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    const start = new Date(startDateParam);
    const end = new Date(endDateParam);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Calculate previous period with no overlap.
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);

    const db = await getDb();
    const usersCollection = db.collection("users");
    const stripeReportingRepo = new StripeReportingRepository(db);
    await stripeReportingRepo.ensureIndexes();

    // Count unique users created in range, robust to mixed createdAt types.
    const getUserCount = async (from: Date, to: Date) => {
      const result = await usersCollection
        .aggregate<{ count: number }>([
          {
            $project: {
              clerkUserId: 1,
              createdAtDate: {
                $convert: {
                  input: "$createdAt",
                  to: "date",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          {
            $match: {
              createdAtDate: {
                $gte: from,
                $lte: to,
              },
            },
          },
          {
            $group: {
              _id: {
                $ifNull: ["$clerkUserId", "$_id"],
              },
            },
          },
          { $count: "count" },
        ])
        .next();

      return result?.count ?? 0;
    };

    const getClvStats = async (from: Date, to: Date): Promise<ClvStats> => {
      const users = await usersCollection
        .find(
          {
            totalSpend: { $gt: 0 },
            $or: [
              { subscriptionStartDate: { $exists: true, $ne: null } },
              { "publicMetadata.purchaseDate": { $exists: true, $ne: null } },
              { plan: { $in: ["premium", "pro", "enterprise"] } },
            ],
          },
          {
            projection: {
              totalSpend: 1,
              plan: 1,
              publicMetadata: 1,
              subscriptionStartDate: 1,
              subscriptionEndDate: 1,
              subscriptionDurationDays: 1,
            },
          }
        )
        .toArray();

      if (!users.length) {
        return {
          customerLifetimeValue: 0,
          averageSubscriptionDurationDays: 0,
        };
      }

      const now = new Date();
      const usersSubscribedInPeriod = users.filter((user) => {
        const startDate =
          normalizeDate(user?.subscriptionStartDate) ||
          normalizeDate(user?.publicMetadata?.purchaseDate);
        if (!startDate) return false;
        const endDate = resolveSubscriptionEndDate(user, now, startDate);
        if (!endDate) return false;
        return startDate.getTime() <= to.getTime() && endDate.getTime() >= from.getTime();
      });

      if (!usersSubscribedInPeriod.length) {
        return {
          customerLifetimeValue: 0,
          averageSubscriptionDurationDays: 0,
        };
      }

      const totalSpend = usersSubscribedInPeriod.reduce(
        (sum, user) => sum + Number(user?.totalSpend || 0),
        0
      );
      const totalDurationDays = usersSubscribedInPeriod.reduce(
        (sum, user) => sum + resolveSubscriptionDurationDays(user, now),
        0
      );

      return {
        customerLifetimeValue: Number(
          (totalSpend / usersSubscribedInPeriod.length).toFixed(2)
        ),
        averageSubscriptionDurationDays: Number(
          (totalDurationDays / usersSubscribedInPeriod.length).toFixed(2)
        ),
      };
    };

    const sumPaidCharges = async (fromTs: number, toTs: number) => {
      let total = 0;
      let startingAfter: string | undefined;

      while (true) {
        const page = await stripe.charges.list({
          created: {
            gte: fromTs,
            lte: toTs,
          },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        for (const charge of page.data) {
          if (charge.paid && !charge.refunded) {
            total += charge.amount - (charge.amount_refunded || 0);
          }
        }

        if (!page.has_more || page.data.length === 0) {
          break;
        }

        startingAfter = page.data[page.data.length - 1].id;
      }

      return total / 100;
    };

    const sumPaidChargesByDay = async (fromTs: number, toTs: number) => {
      const daily = new Map<string, number>();
      let startingAfter: string | undefined;

      while (true) {
        const page = await stripe.charges.list({
          created: {
            gte: fromTs,
            lte: toTs,
          },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        for (const charge of page.data) {
          if (charge.paid && !charge.refunded) {
            const dayKey = toDayKey(new Date(charge.created * 1000));
            const amount = (charge.amount - (charge.amount_refunded || 0)) / 100;
            daily.set(dayKey, (daily.get(dayKey) ?? 0) + amount);
          }
        }

        if (!page.has_more || page.data.length === 0) {
          break;
        }

        startingAfter = page.data[page.data.length - 1].id;
      }

      return daily;
    };

    const getUserDailyCounts = async (from: Date, to: Date) => {
      const rows = await usersCollection
        .aggregate<{ date: string; count: number }>([
          {
            $project: {
              clerkUserId: 1,
              createdAtDate: {
                $convert: {
                  input: "$createdAt",
                  to: "date",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          {
            $match: {
              createdAtDate: { $gte: from, $lte: to },
            },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAtDate",
                    timezone: "UTC",
                  },
                },
                user: { $ifNull: ["$clerkUserId", "$_id"] },
              },
            },
          },
          {
            $group: {
              _id: "$_id.date",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              date: "$_id",
              count: 1,
            },
          },
        ])
        .toArray();

      return new Map(rows.map((row) => [row.date, row.count]));
    };

    const getStripeData = async (from: Date, to: Date) => {
      const kpis = await stripeReportingRepo.getKpis(from, to);

      return {
        newSubscriptions: kpis.subscribers.startedInPeriod,
        activeSubscribers: kpis.subscribers.currentActive,
        cancelledSubscribers: kpis.subscribers.canceledInPeriod,
        daily: kpis.daily,
      };
    };

    // Parallel fetch
    const [
      previousUsers, 
      currentStripe, 
      previousStripe,
      currentClv,
      previousClv,
    ] = await Promise.all([
      getUserCount(previousStart, previousEnd),
      getStripeData(start, end),
      getStripeData(previousStart, previousEnd),
      getClvStats(start, end),
      getClvStats(previousStart, previousEnd),
    ]);

    const [
      userDailyMap,
      revenueDailyMap,
      previousRevenue,
      googleAdsDailyMap,
      previousGoogleAdsDailyMap,
      googleAdsCampaigns,
    ] = await Promise.all([
      getUserDailyCounts(start, end),
      sumPaidChargesByDay(
        Math.floor(start.getTime() / 1000),
        Math.floor(end.getTime() / 1000)
      ),
      sumPaidCharges(
        Math.floor(previousStart.getTime() / 1000),
        Math.floor(previousEnd.getTime() / 1000)
      ),
      getGoogleAdsCostByDay(start, end),
      getGoogleAdsCostByDay(previousStart, previousEnd),
      getGoogleAdsCampaignPerformance(start, end),
    ]);

    const currentUsers = Array.from(userDailyMap.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const currentRevenue = Array.from(revenueDailyMap.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const googleAdsCost = Array.from(googleAdsDailyMap.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const previousGoogleAdsCost = Array.from(
      previousGoogleAdsDailyMap.values()
    ).reduce((sum, value) => sum + value, 0);

    const dayKeys = enumerateDayKeys(start, end);
    const stripeDailyStartedMap = new Map(
      (currentStripe.daily ?? []).map((row: { date: string; startedSubscriptions: number }) => [
        row.date,
        row.startedSubscriptions,
      ])
    );
    const stripeDailyCanceledMap = new Map(
      (currentStripe.daily ?? []).map((row: { date: string; canceledSubscriptions: number }) => [
        row.date,
        row.canceledSubscriptions,
      ])
    );

    const activeByDay = new Map<string, number>();
    let futureNet = 0;
    for (let i = dayKeys.length - 1; i >= 0; i -= 1) {
      const key = dayKeys[i];
      activeByDay.set(key, Math.max(0, currentStripe.activeSubscribers - futureNet));
      futureNet +=
        (stripeDailyStartedMap.get(key) ?? 0) - (stripeDailyCanceledMap.get(key) ?? 0);
    }

    const dailyTrends: DailyTrendPoint[] = dayKeys.map((key) => ({
      date: key,
      newUsers: userDailyMap.get(key) ?? 0,
      newSubscriptions: stripeDailyStartedMap.get(key) ?? 0,
      activeSubscribers: activeByDay.get(key) ?? 0,
      cancelledSubscribers: stripeDailyCanceledMap.get(key) ?? 0,
      revenue: revenueDailyMap.get(key) ?? 0,
      googleAdsCost: googleAdsDailyMap.get(key) ?? 0,
    }));

    const reportData: ReportPayload = {
      newUsers: {
        current: currentUsers,
        previous: previousUsers,
        change: calculateChange(currentUsers, previousUsers),
      },
      newSubscriptions: {
        current: currentStripe.newSubscriptions,
        previous: previousStripe.newSubscriptions,
        change: calculateChange(currentStripe.newSubscriptions, previousStripe.newSubscriptions),
      },
      activeSubscribers: {
        current: currentStripe.activeSubscribers,
        previous: previousStripe.activeSubscribers,
        change: calculateChange(currentStripe.activeSubscribers, previousStripe.activeSubscribers),
      },
      cancelledSubscribers: {
        current: currentStripe.cancelledSubscribers,
        previous: previousStripe.cancelledSubscribers,
        change: calculateChange(currentStripe.cancelledSubscribers, previousStripe.cancelledSubscribers),
      },
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        change: calculateChange(currentRevenue, previousRevenue),
      },
      googleAdsCost: {
        current: googleAdsCost,
        previous: previousGoogleAdsCost,
        change: calculateChange(googleAdsCost, previousGoogleAdsCost),
      },
      customerLifetimeValue: {
        current: currentClv.customerLifetimeValue,
        previous: previousClv.customerLifetimeValue,
        change: calculateChange(
          currentClv.customerLifetimeValue,
          previousClv.customerLifetimeValue
        ),
      },
      averageSubscriptionDurationDays: {
        current: currentClv.averageSubscriptionDurationDays,
        previous: previousClv.averageSubscriptionDurationDays,
        change: calculateChange(
          currentClv.averageSubscriptionDurationDays,
          previousClv.averageSubscriptionDurationDays
        ),
      },
      dailyTrends,
      googleAdsCampaigns,
    };

    return NextResponse.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      previousPeriod: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
      data: reportData
    });

  } catch (error) {
    console.error("Error in quick report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
