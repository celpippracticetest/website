import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import Stripe from "stripe";
import client from "@/lib/appDocumentsClient";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

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
      sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Resolve user via Supabase Auth admin (Clerk-shaped AppShapeUser)
    const authAdmin = await appUserAdmin();
    let user;
    let customerId: string | undefined;

    try {
      user = await authAdmin.users.getUser(userId);
      customerId = user.privateMetadata?.stripeCustomerId as string | undefined;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: `User not found in auth directory: ${message}` },
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

      // Persist Stripe customer id on the auth user for next time
      await authAdmin.users.updateUserMetadata(userId, {
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

    const db = client.db();
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

    // Update auth directory metadata
    const currentMetadata = (user.publicMetadata || {}) as Record<string, any>;
    const updatedMetadata = {
      ...currentMetadata,
      plan: "free",
      planCancelled: true,
      subscriptionCancelledAt: now.toISOString(),
      subscriptionDurationDays,
    };

    await authAdmin.users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata,
    });

    await usersCollection.updateOne(
      matchUsersCollectionByWebUserIds(userId),
      {
        $set: {
          plan: "free",
          planType: null,
          publicMetadata: updatedMetadata,
          subscriptionStartDate: subscriptionStartDate ?? null,
          subscriptionEndDate: now,
          subscriptionDurationDays,
          updatedAt: now,
        },
      },
      { upsert: false }
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
