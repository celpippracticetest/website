import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(userId);

    const customerId = await resolveStripeCustomerId(userId, {
      stripeCustomerIdFromPrivate: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromAuthUser(user),
    });

    if (!customerId) {
      return NextResponse.json(
        { error: "Stripe customer not found" },
        { status: 422 }
      );
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: "No active subscriptions found" },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0] as Stripe.Subscription & {
      current_period_end?: number;
    };

    // Calculate resume date: current_period_end + 3 months
    // current_period_end is in seconds
    let currentPeriodEndTimestamp = subscription.current_period_end;
    
    // Safety check for current_period_end
    if (!currentPeriodEndTimestamp) {
        console.warn(`Subscription ${subscription.id} missing current_period_end, using Date.now()`);
        currentPeriodEndTimestamp = Math.floor(Date.now() / 1000);
    }

    const currentPeriodEnd = new Date(currentPeriodEndTimestamp * 1000);
    const resumeDate = new Date(currentPeriodEnd);
    resumeDate.setMonth(resumeDate.getMonth() + 3);
    
    // Convert to unix timestamp
    const resumesAtTimestamp = Math.floor(resumeDate.getTime() / 1000);

    if (isNaN(resumesAtTimestamp)) {
        throw new Error("Failed to calculate a valid resume date");
    }

    // Update subscription to pause collection
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        pause_collection: {
          behavior: 'void',
          resumes_at: resumesAtTimestamp,
        },
      }
    );

    return NextResponse.json({ 
      success: true, 
      subscription: updatedSubscription,
      message: `Subscription paused until ${resumeDate.toLocaleDateString()}`
    });
    
  } catch (error: any) {
    console.error("Error pausing subscription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to pause subscription" },
      { status: 500 }
    );
  }
}
