import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedRequestContext(request);
    const userId = authContext?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's Stripe customer ID
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    let customerId = user.privateMetadata?.stripeCustomerId as string | undefined;

    if (!customerId) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: "No Stripe customer found" 
      });
    }

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ 
        hasSubscription: false,
        message: "No active subscription found" 
      });
    }

    const subscription = subscriptions.data[0] as any;
    
    // Calculate days left
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const today = new Date();
    const timeDiff = currentPeriodEnd.getTime() - today.getTime();
    const daysLeft = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));

    // Calculate total days in current period
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const totalDays = Math.ceil((currentPeriodEnd.getTime() - currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        planId: subscription.items.data[0]?.price?.id,
      },
      daysLeft,
      totalDays,
      isActive: subscription.status === "active",
      willCancel: subscription.cancel_at_period_end,
    });

  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
