import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/express";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await clerkClient.users.getUser(userId);

    let customerId = user.privateMetadata?.stripeCustomerId as
      | string
      | undefined;

    if (!customerId) {
      // Try to find by email if not in metadata
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (!email) {
        return NextResponse.json(
          { error: "User email not found" },
          { status: 400 }
        );
      }

      const customers = await stripe.customers.list({ email });
      if (customers.data.length === 0) {
        return NextResponse.json(
          { error: "Stripe customer not found" },
          { status: 404 }
        );
      }

      customerId = customers.data[0].id;
      
      // Update metadata for future use
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          stripeCustomerId: customerId,
        },
      });
    }

    // Get active subscriptions that might be set to cancel
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Check if there are any trailing subscriptions or past due?
      // For now assume "active" includes those set to cancel at period end.
      return NextResponse.json(
        { error: "No active subscriptions found" },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];

    // Update subscription to NOT cancel at period end and clear any pause collection
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: false,
        pause_collection: "", // Passing empty string to unset/clear the pause_collection
      }
    );

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        planCancelled: false,
      },
    });

    return NextResponse.json({ 
      success: true, 
      subscription: updatedSubscription 
    });
    
  } catch (error: any) {
    console.error("Error reactivating subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
