import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/express";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          stripeCustomerId: customerId,
        },
      });
    }

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

    for (const sub of subscriptions.data) {
      await stripe.subscriptions.update(sub.id, {
        cancel_at_period_end: true,
      });
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        planCancelled: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
