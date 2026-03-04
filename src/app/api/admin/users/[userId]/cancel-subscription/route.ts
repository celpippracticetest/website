import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import client from "@/lib/mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await props.params;
    const { userId } = resolvedParams;

    // Check admin authorization
    const authenticate = await auth();
    const isAdmin =
      authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user from Clerk
    const clerkClientInstance = await clerkClient();
    let user;
    let customerId: string | undefined;

    try {
      user = await clerkClientInstance.users.getUser(userId);
      customerId = user.privateMetadata?.stripeCustomerId as string | undefined;
    } catch (error: any) {
      return NextResponse.json(
        { error: `User not found in Clerk: ${error.message}` },
        { status: 404 }
      );
    }

    // If no customerId in metadata, try to find by email
    if (!customerId) {
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

      // Save customerId to Clerk for future use
      await clerkClientInstance.users.updateUserMetadata(userId, {
        privateMetadata: {
          ...user.privateMetadata,
          stripeCustomerId: customerId,
        },
      });
    }

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "No active subscriptions found" },
        { status: 404 }
      );
    }

    const canceledSubs = [];

    // Cancel all active subscriptions immediately
    for (const sub of subscriptions.data) {
      const canceled = await stripe.subscriptions.cancel(sub.id, {
        prorate: true,
      });
      canceledSubs.push({
        id: canceled.id,
        status: canceled.status,
      });
    }

    // Update Clerk metadata
    const currentMetadata = (user.publicMetadata || {}) as Record<string, any>;
    const updatedMetadata = {
      ...currentMetadata,
      plan: "free",
      planCancelled: true,
    };

    await clerkClientInstance.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });

    // Update MongoDB users collection
    const db = client.db();
    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { clerkUserId: userId },
      {
        $set: {
          plan: "free",
          planType: null,
          publicMetadata: updatedMetadata,
          updatedAt: new Date(),
        },
      },
      { upsert: false }
    );

    console.log(
      `✅ Admin canceled subscription for user ${userId}. Canceled ${canceledSubs.length} subscription(s)`
    );

    return NextResponse.json({
      success: true,
      canceledSubscriptions: canceledSubs,
      message: `Canceled ${canceledSubs.length} subscription(s)`,
    });
  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
