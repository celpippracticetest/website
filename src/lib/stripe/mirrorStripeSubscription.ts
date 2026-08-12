import "server-only";

import type Stripe from "stripe";
import documentsClient from "@/lib/appDocumentsClient";
import { getSql } from "@/lib/pg/pool";

function unixToDate(unix: number | null | undefined): Date | null {
  if (unix == null || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000);
}

function subscriptionPeriodUnix(
  subscription: Stripe.Subscription,
  field: "current_period_start" | "current_period_end"
): number | null {
  const top = (subscription as Stripe.Subscription & Record<string, unknown>)[
    field
  ];
  if (typeof top === "number" && Number.isFinite(top)) return top;
  const item = subscription.items?.data?.[0] as
    | (Stripe.SubscriptionItem & Record<string, unknown>)
    | undefined;
  const fromItem = item?.[field];
  if (typeof fromItem === "number" && Number.isFinite(fromItem)) return fromItem;
  return null;
}

function toMetadata(
  metadata?: Stripe.Metadata | null
): Record<string, string> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, String(value)])
  );
}

/**
 * Keep `public.stripe_subscriptions` (CMS users list) aligned with live Stripe.
 * Also mirrors into the documents collection used by reporting sync.
 */
export async function mirrorStripeSubscriptionRow(
  subscription: Stripe.Subscription
): Promise<void> {
  const firstPrice = subscription.items?.data?.[0]?.price;
  const subAny = subscription as Stripe.Subscription & {
    discount?: {
      coupon?: { id?: string } | string | null;
      promotion_code?: { id?: string } | string | null;
    } | null;
  };
  const discountObject = subAny.discount || null;
  const couponId =
    (typeof discountObject?.coupon === "object" && discountObject?.coupon?.id) ||
    (typeof discountObject?.coupon === "string" ? discountObject.coupon : null);
  const promotionCodeId =
    (typeof discountObject?.promotion_code === "object" &&
      discountObject?.promotion_code?.id) ||
    (typeof discountObject?.promotion_code === "string"
      ? discountObject.promotion_code
      : null);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  const status = subscription.status;
  const dunningStatus =
    status === "past_due" ||
    status === "unpaid" ||
    status === "incomplete_expired"
      ? status
      : null;

  const createdAt = unixToDate(subscription.created) ?? new Date();
  const currentPeriodStartAt = unixToDate(
    subscriptionPeriodUnix(subscription, "current_period_start")
  );
  const currentPeriodEndAt = unixToDate(
    subscriptionPeriodUnix(subscription, "current_period_end")
  );
  const canceledAt = unixToDate(subscription.canceled_at);
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  const priceId = firstPrice?.id || null;
  const interval = firstPrice?.recurring?.interval || null;
  const intervalCount = firstPrice?.recurring?.interval_count || null;
  const metadata = toMetadata(subscription.metadata);
  const updatedAt = new Date();

  try {
    const sql = getSql();
    await sql`
      INSERT INTO public.stripe_subscriptions (
        stripe_id,
        customer_id,
        status,
        created_at,
        current_period_start_at,
        current_period_end_at,
        canceled_at,
        cancel_at_period_end,
        price_id,
        interval,
        interval_count,
        coupon_id,
        promotion_code_id,
        dunning_status,
        metadata,
        updated_at
      ) VALUES (
        ${subscription.id},
        ${customerId},
        ${status},
        ${createdAt},
        ${currentPeriodStartAt},
        ${currentPeriodEndAt},
        ${canceledAt},
        ${cancelAtPeriodEnd},
        ${priceId},
        ${interval},
        ${intervalCount},
        ${couponId},
        ${promotionCodeId},
        ${dunningStatus},
        ${JSON.stringify(metadata)}::jsonb,
        ${updatedAt}
      )
      ON CONFLICT (stripe_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        status = EXCLUDED.status,
        current_period_start_at = EXCLUDED.current_period_start_at,
        current_period_end_at = EXCLUDED.current_period_end_at,
        canceled_at = EXCLUDED.canceled_at,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        price_id = EXCLUDED.price_id,
        interval = EXCLUDED.interval,
        interval_count = EXCLUDED.interval_count,
        coupon_id = EXCLUDED.coupon_id,
        promotion_code_id = EXCLUDED.promotion_code_id,
        dunning_status = EXCLUDED.dunning_status,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (err) {
    console.warn(
      "[mirrorStripeSubscriptionRow] public.stripe_subscriptions upsert failed",
      err
    );
  }

  try {
    const db = await documentsClient.db();
    await db.collection("stripe_subscriptions").updateOne(
      { stripeId: subscription.id },
      {
        $set: {
          stripeId: subscription.id,
          customerId,
          status,
          createdAt,
          currentPeriodStartAt,
          currentPeriodEndAt,
          canceledAt,
          cancelAtPeriodEnd,
          priceId,
          interval,
          intervalCount,
          couponId,
          promotionCodeId,
          dunningStatus,
          metadata,
          updatedAt,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn(
      "[mirrorStripeSubscriptionRow] documents stripe_subscriptions upsert failed",
      err
    );
  }
}
