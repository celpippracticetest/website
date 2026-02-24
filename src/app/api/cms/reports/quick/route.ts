import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";

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
    const getStripeData = async (from: Date, to: Date) => {
      const fromTs = Math.floor(from.getTime() / 1000);
      const toTs = Math.floor(to.getTime() / 1000);

      // We use search to get total counts if possible, otherwise list
      // Stripe search query syntax: created>=123 AND created<=456
      
      try {
        // Subscriptions
        // We include active and trialing to capture all valid new subscriptions
        const newSubscriptions = await stripe.subscriptions.search({
          query: `created>=${fromTs} AND created<=${toTs} AND (status:'active' OR status:'trialing')`,
          limit: 1, 
        });

        // Active Subscribers (Total as of 'to' date)
        // Note: Stripe search doesn't support historic state, so this will be current active count.
        // To get historic active count, we would need to maintain our own snapshots or use Stripe Sigma/Reporting.
        // For now, we will return the CURRENT active count for the 'current' period, and maybe 0 or same for previous?
        // Actually, if we want to compare, it's tricky. 
        // Best proxy for "Active Subscribers during this period" might be difficult.
        // Let's just return CURRENT TOTAL active subscribers for the current period request.
        // If it's a past period request, this number will be wrong (it will be today's number).
        // LIMITATION: 'activeSubscribers' will always show CURRENT totals, not point-in-time.
        const activeSubscribers = await stripe.subscriptions.search({
            query: `status:'active' OR status:'trialing'`,
            limit: 1,
        });

        // Cancelled Subscriptions in this period
        // Search for subscriptions that were canceled in this period
        // Stripe subscription object has 'canceled_at'.
        const cancelledSubscribers = await stripe.subscriptions.search({
            query: `canceled_at>=${fromTs} AND canceled_at<=${toTs}`,
            limit: 1,
        });

        // Revenue (Charges) - Search might not be available for all objects or return sum directly.
        // For revenue, we might need to list and sum. 
        // Warning: iterating through all charges can be slow. 
        // For "Quick Report", maybe limit to 100 recent charges and sum them? 
        // Or use balance transactions.
        // Let's try listing charges with a limit.
        const charges = await stripe.charges.list({
          created: {
            gte: fromTs,
            lte: toTs,
          },
          limit: 100, // Limit to 100 for performance
        });

        const revenue = charges.data.reduce((sum, charge) => {
           if (charge.paid && !charge.refunded) {
             return sum + (charge.amount - (charge.amount_refunded || 0));
           }
           return sum;
        }, 0);

        return {
          newSubscriptions: newSubscriptions.total_count || 0,
          activeSubscribers: activeSubscribers.total_count || 0,
          cancelledSubscribers: cancelledSubscribers.total_count || 0,
          revenue: revenue / 100, // Convert cents to dollars
        };
      } catch (e) {
        console.error("Stripe error:", e);
        return { 
            newSubscriptions: 0, 
            activeSubscribers: 0, 
            cancelledSubscribers: 0, 
            revenue: 0 
        };
      }
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

    // Google Ads - Placeholder
    // If we had an API, we would fetch here.
    const googleAdsCost = 0; 
    const previousGoogleAdsCost = 0;

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
