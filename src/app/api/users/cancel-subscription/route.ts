import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import Stripe from "stripe";
import clientPromise from "@/lib/appDocumentsClient";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";
import { sendGa4Events } from "@/lib/ga4MeasurementProtocol";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function normalizeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthlyMrrFromPrice(price: Stripe.Price | string | undefined): number | undefined {
  if (!price || typeof price === "string") return undefined;
  const amount = (price.unit_amount || 0) / 100;
  const recurring = price.recurring;
  if (!recurring?.interval || amount <= 0) return undefined;
  const count = recurring.interval_count || 1;
  if (recurring.interval === "month") return amount / count;
  if (recurring.interval === "year") return amount / (12 * count);
  if (recurring.interval === "week") return (amount * 52) / (12 * count);
  if (recurring.interval === "day") return (amount * 365) / (12 * count);
  return undefined;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const flowId = typeof body?.flowId === "string" ? body.flowId : null;
    const reason = typeof body?.reason === "string" ? body.reason : null;
    const reasonText =
      typeof body?.reasonText === "string" ? body.reasonText : null;

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
      reason: reason || null,
      metadata: reasonText ? { reasonText } : null,
      createdAt: now,
    });

    const plan =
      (user.publicMetadata as Record<string, unknown> | undefined)?.planType ||
      (user.publicMetadata as Record<string, unknown> | undefined)?.plan ||
      undefined;
    const gaClientId = `uid.${userId.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64) || "unknown"}`;
    const events: { name: string; params?: Record<string, unknown> }[] = [];
    if (reason) {
      events.push({
        name: "cancel_reason_submit",
        params: {
          reason,
          reason_text: reasonText || undefined,
          plan: typeof plan === "string" ? plan : undefined,
          flow_id: flowId || undefined,
        },
      });
    }
    events.push({
      name: "subscription_cancel",
      params: {
        plan: typeof plan === "string" ? plan : undefined,
        days_subscribed: subscriptionDurationDays,
        mrr_lost: monthlyMrrFromPrice(subscriptions.data[0]?.items.data[0]?.price),
        will_expire_at: subscriptions.data[0]?.cancel_at
          ? new Date(subscriptions.data[0].cancel_at * 1000).toISOString()
          : (() => {
              const periodEnd = (
                subscriptions.data[0] as Stripe.Subscription & {
                  current_period_end?: number;
                }
              )?.current_period_end;
              return periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : undefined;
            })(),
        flow_id: flowId || undefined,
        cancellation_reason: reason || "user_cancelled",
      },
    });
    void sendGa4Events({
      clientId: gaClientId,
      userId,
      events,
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
