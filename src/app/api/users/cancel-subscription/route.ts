import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/express";
import { auth } from "@clerk/nextjs/server";

import clientPromise from "@/lib/mongodb";
import { stripe } from "@/lib/stripe";

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const flowId = typeof body?.flowId === "string" ? body.flowId : null;

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

    const mongoClient = await clientPromise;
    const db = mongoClient.db();
    const usersCollection = db.collection("users");
    const userActivityCollection = db.collection("useractivities");

    const latestStartEvent = await userActivityCollection.findOne(
      {
        userId,
        eventType: "subscription_created",
      },
      {
        sort: { timestampUtc: -1 },
        projection: { timestampUtc: 1 },
      }
    );

    const now = new Date();
    const subscriptionStartDate =
      normalizeDate(latestStartEvent?.timestampUtc) ||
      normalizeDate((user.publicMetadata as Record<string, unknown>)?.purchaseDate);
    const subscriptionDurationDays = subscriptionStartDate
      ? Math.max(
          1,
          Math.ceil(
            (now.getTime() - subscriptionStartDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        planCancelled: true,
        subscriptionCancelledAt: now.toISOString(),
        subscriptionDurationDays,
      },
    });

    await usersCollection.updateOne(
      { clerkUserId: userId },
      {
        $set: {
          subscriptionStartDate: subscriptionStartDate ?? null,
          subscriptionEndDate: now,
          subscriptionDurationDays,
          updatedAt: now,
        },
      }
    );

    await db.collection("cancellation_flow_events").insertOne({
      userId,
      flowId,
      eventName: "subscription_cancelled_success",
      step: "confirm",
      reason: null,
      metadata: null,
      createdAt: now,
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
