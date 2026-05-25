import { NextRequest, NextResponse } from "next/server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import Stripe from "stripe";
import clientPromise from "@/lib/appDocumentsClient";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { cancelGooglePlaySubscriptionForUser, findGooglePlaySubscriptionForUser } from "@/lib/mobile/googlePlaySubscription";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isGooglePlaySubscriber(publicMetadata: Record<string, unknown>): boolean {
  const source = String(publicMetadata.planSource ?? "").trim().toLowerCase();
  return source === "google_play" || source === "google_play_rtdn";
}

export async function POST(req: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuthenticatedRequest(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = ctx;

  try {
    const body = await req.json().catch(() => ({}));
    const flowId = typeof body?.flowId === "string" ? body.flowId : null;

    const publicMetadata = ctx.user.publicMetadata ?? {};
    const supabaseAuthUserId = ctx.supabaseAuthUserId?.trim() || null;

    const googlePlayRow =
      supabaseAuthUserId != null
        ? await findGooglePlaySubscriptionForUser(supabaseAuthUserId)
        : null;

    if (googlePlayRow || (supabaseAuthUserId && isGooglePlaySubscriber(publicMetadata))) {
      if (!supabaseAuthUserId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      await cancelGooglePlaySubscriptionForUser({
        supabaseAuthUserId,
        userId,
      });

      const documentsClient = await clientPromise;
      const db = documentsClient.db();
      await db.collection("cancellation_flow_events").insertOne({
        userId,
        flowId,
        eventName: "subscription_cancelled_success",
        step: "confirm",
        reason: null,
        metadata: { source: "google_play" },
        createdAt: new Date(),
      });

      return NextResponse.json({ success: true });
    }

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
        { error: "No active subscription found for this account." },
        { status: 422 }
      );
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

    const documentsClient = await clientPromise;
    const db = documentsClient.db();
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

    await authAdmin.users.updateUserMetadata(userId, {
      publicMetadata: {
        planCancelled: true,
        subscriptionCancelledAt: now.toISOString(),
        subscriptionDurationDays,
      },
    });

    await usersCollection.updateOne(
      matchUsersCollectionByWebUserIds(userId),
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
    const message =
      error instanceof Error ? error.message : "Failed to cancel subscription";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
