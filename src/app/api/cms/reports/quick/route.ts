import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";

const formatDateForGa4 = (date: Date) => date.toISOString().slice(0, 10);

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

    // Calculate previous period
    const duration = end.getTime() - start.getTime();
    const previousEnd = new Date(start.getTime()); // Previous end is current start
    const previousStart = new Date(previousEnd.getTime() - duration);

    const db = client.db();
    const usersCollection = db.collection("users");

    // Helper to get counts
    const getUserCount = async (from: Date, to: Date) => {
      // MongoDB stores dates as Date objects usually, but sometimes strings. 
      // The user route uses createdAt from "users" collection. 
      // Let's assume Date objects or ISO strings that compare correctly.
      // In the user route, it seemed to just project createdAt.
      // We will try both Date object and string comparison if needed, but start with Date.
      // Actually, looking at user route, it didn't show the schema, but usually it's Date.
      return await usersCollection.countDocuments({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    };

    // Stripe helpers
    const countSubscriptions = async (params: Stripe.SubscriptionListParams) => {
      let count = 0;
      let startingAfter: string | undefined;

      while (true) {
        const page = await stripe.subscriptions.list({
          ...params,
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        count += page.data.length;
        if (!page.has_more || page.data.length === 0) {
          break;
        }

        startingAfter = page.data[page.data.length - 1].id;
      }

      return count;
    };

    const countStripeEvents = async (
      types: Stripe.EventListParams["types"],
      fromTs: number,
      toTs: number
    ) => {
      let count = 0;
      let startingAfter: string | undefined;

      while (true) {
        const page = await stripe.events.list({
          types,
          created: {
            gte: fromTs,
            lte: toTs,
          },
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        count += page.data.length;
        if (!page.has_more || page.data.length === 0) {
          break;
        }

        startingAfter = page.data[page.data.length - 1].id;
      }

      return count;
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

    const safeStripeMetric = async (
      metricName: string,
      getValue: () => Promise<number>
    ) => {
      try {
        return await getValue();
      } catch (error) {
        console.error(`Stripe quick report metric failed: ${metricName}`, error);
        return 0;
      }
    };

    const getStripeData = async (from: Date, to: Date) => {
      const fromTs = Math.floor(from.getTime() / 1000);
      const toTs = Math.floor(to.getTime() / 1000);

      const [newSubscriptions, activeSubscribers, cancelledSubscribers, revenue] =
        await Promise.all([
          // Count all subscriptions created during the selected period.
          safeStripeMetric("newSubscriptions", () =>
            countSubscriptions({
              status: "all",
              created: {
                gte: fromTs,
                lte: toTs,
              },
            })
          ),
          // Active total is a current snapshot (active + trialing), not a historical point-in-time value.
          safeStripeMetric("activeSubscribers", async () => {
            const [activeCount, trialingCount] = await Promise.all([
              countSubscriptions({ status: "active" }),
              countSubscriptions({ status: "trialing" }),
            ]);
            return activeCount + trialingCount;
          }),
          // Cancellations are tracked via subscription deletion events in the selected period.
          safeStripeMetric("cancelledSubscribers", () =>
            countStripeEvents(["customer.subscription.deleted"], fromTs, toTs)
          ),
          safeStripeMetric("revenue", () => sumPaidCharges(fromTs, toTs)),
        ]);

      return {
        newSubscriptions,
        activeSubscribers,
        cancelledSubscribers,
        revenue,
      };
    };

    // Parallel fetch
    const [
      currentUsers, 
      previousUsers, 
      currentStripe, 
      previousStripe
    ] = await Promise.all([
      getUserCount(start, end),
      getUserCount(previousStart, previousEnd),
      getStripeData(start, end),
      getStripeData(previousStart, previousEnd),
    ]);

    const [googleAdsCost, previousGoogleAdsCost] = await Promise.all([
      getGoogleAdsCost(start, end),
      getGoogleAdsCost(previousStart, previousEnd),
    ]);

    return NextResponse.json({
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      previousPeriod: {
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
      data: {
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
          current: currentStripe.revenue,
          previous: previousStripe.revenue,
          change: calculateChange(currentStripe.revenue, previousStripe.revenue),
        },
        googleAdsCost: {
          current: googleAdsCost,
          previous: previousGoogleAdsCost,
          change: calculateChange(googleAdsCost, previousGoogleAdsCost),
        }
      }
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
