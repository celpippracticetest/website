import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { z } from "zod";
import client from "@/lib/mongodb";
import { ObjectId } from "bson";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.object({
  userId: z.string().trim().min(1),
  action: z.enum(["refund_last_payment", "cancel_subscription"]),
  requestId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.roles?.includes("admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, action, requestId } = parsed.data;

    // Get the refund request to access user email
    const db = client.db();
    const refundRequest = await db.collection("refundRequests").findOne({
      _id: new ObjectId(requestId),
    });

    if (!refundRequest) {
      return NextResponse.json(
        { error: "Refund request not found" },
        { status: 404 }
      );
    }

    const userEmail = refundRequest.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found in refund request" },
        { status: 400 }
      );
    }

    // Get user from Clerk (if exists)
    const clerkClientInstance = await clerkClient();
    let customerId: string | undefined;
    
    try {
      const user = await clerkClientInstance.users.getUser(userId);
      customerId = user.privateMetadata?.stripeCustomerId as string | undefined;
    } catch (error: any) {
      // User might not exist in Clerk, continue with email lookup
      console.log(`User ${userId} not found in Clerk, will use email lookup`);
    }

    // If no customerId in metadata, try to find by email
    if (!customerId) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length === 0) {
        return NextResponse.json(
          { error: `Stripe customer not found for email: ${userEmail}` },
          { status: 404 }
        );
      }

      customerId = customers.data[0].id;

      // Try to update user metadata with customerId for future use (if user exists)
      try {
        await clerkClientInstance.users.updateUserMetadata(userId, {
          privateMetadata: {
            stripeCustomerId: customerId,
          },
        });
      } catch (error) {
        // Ignore if user doesn't exist in Clerk
      }
    }

    if (action === "refund_last_payment") {
      // Get the last payment intent for this customer
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 1,
      });

      if (charges.data.length === 0) {
        return NextResponse.json(
          { error: "No payments found for this user" },
          { status: 404 }
        );
      }

      const lastCharge = charges.data[0];

      // Check if already refunded
      if (lastCharge.refunded) {
        return NextResponse.json(
          { error: "This payment has already been refunded" },
          { status: 400 }
        );
      }

      // Check if partially refunded
      const amountToRefund = lastCharge.amount - (lastCharge.amount_refunded || 0);
      if (amountToRefund <= 0) {
        return NextResponse.json(
          { error: "This payment has already been fully refunded" },
          { status: 400 }
        );
      }

      // Create refund
      const refund = await stripe.refunds.create({
        charge: lastCharge.id,
        amount: amountToRefund,
        reason: "requested_by_customer",
        metadata: {
          refund_request_id: requestId,
          admin_action: "true",
        },
      });

      // Update refund request status to "refunded"
      await db.collection("refundRequests").updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "refunded",
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        action: "refund_last_payment",
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          currency: refund.currency,
          status: refund.status,
        },
        message: `Refunded ${refund.currency.toUpperCase()} ${(refund.amount / 100).toFixed(2)}`,
      });
    }

    if (action === "cancel_subscription") {
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

      // Try to update Clerk metadata (if user exists)
      try {
        await clerkClientInstance.users.updateUserMetadata(userId, {
          publicMetadata: {
            plan: "free",
            planCancelled: true,
          },
        });
      } catch (error) {
        // Ignore if user doesn't exist in Clerk
      }

      // Update refund request status to "done"
      await db.collection("refundRequests").updateOne(
        { _id: new ObjectId(requestId) },
        {
          $set: {
            status: "done",
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        action: "cancel_subscription",
        canceledSubscriptions: canceledSubs,
        message: `Canceled ${canceledSubs.length} subscription(s)`,
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error performing refund request action:", error);
    return NextResponse.json(
      { error: error.message || "Failed to perform action" },
      { status: 500 }
    );
  }
}
