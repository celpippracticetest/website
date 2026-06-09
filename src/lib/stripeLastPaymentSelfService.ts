import "server-only";

import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

/** Self-serve instant refund after submitting a refund request (within {@link LAST_PAYMENT_INSTANT_REFUND_MAX_MS}). */
export const SELF_SERVICE_INSTANT_REFUND_ENABLED = false;

/** Payments at most this old (ms) qualify for self-serve refund of the latest charge. */
export const LAST_PAYMENT_INSTANT_REFUND_MAX_MS = 48 * 60 * 60 * 1000;

export type LastPaymentInstantRefundEligibility =
  | {
      eligible: true;
      chargeId: string;
      paidAtIso: string;
      amountCents: number;
      currency: string;
      amountDisplay: string;
    }
  | {
      eligible: false;
      reason:
        | "no_charge"
        | "not_refundable"
        | "outside_window"
        | "disabled"
        | "stripe_error";
      message: string;
    };

function pickLatestRefundableCharge(charges: Stripe.Charge[]): Stripe.Charge | null {
  for (const c of charges) {
    if (!c.paid || c.status !== "succeeded") continue;
    if (c.dispute) continue;
    const remaining = c.amount - (c.amount_refunded || 0);
    if (remaining <= 0) continue;
    return c;
  }
  return null;
}

export async function getLastPaymentInstantRefundEligibility(
  customerId: string
): Promise<LastPaymentInstantRefundEligibility> {
  if (!SELF_SERVICE_INSTANT_REFUND_ENABLED) {
    return {
      eligible: false,
      reason: "disabled",
      message:
        "Automatic refunds are not available. Our team will review your refund request.",
    };
  }

  try {
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 10,
    });

    const last = pickLatestRefundableCharge(charges.data);
    if (!last) {
      return {
        eligible: false,
        reason: "no_charge",
        message: "No recent refundable card payment was found for your account.",
      };
    }

    const paidAtMs = last.created * 1000;
    const ageMs = Date.now() - paidAtMs;
    if (ageMs > LAST_PAYMENT_INSTANT_REFUND_MAX_MS) {
      return {
        eligible: false,
        reason: "outside_window",
        message: "Your last payment is outside the automatic refund window.",
      };
    }

    const amountCents = last.amount - (last.amount_refunded || 0);
    if (amountCents <= 0) {
      return {
        eligible: false,
        reason: "not_refundable",
        message: "Your last payment has already been refunded.",
      };
    }

    return {
      eligible: true,
      chargeId: last.id,
      paidAtIso: new Date(paidAtMs).toISOString(),
      amountCents,
      currency: last.currency,
      amountDisplay: `${(amountCents / 100).toFixed(2)} ${last.currency.toUpperCase()}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    return {
      eligible: false,
      reason: "stripe_error",
      message,
    };
  }
}

export type InstantRefundPerformResult =
  | {
      ok: true;
      refundId: string;
      refundedAmountDisplay: string;
      canceledSubscriptionCount: number;
    }
  | { ok: false; message: string };

/**
 * Refund the latest eligible charge (must re-check eligibility) and cancel active subscriptions.
 */
export async function refundLastPaymentAndCancelSubscriptions(params: {
  customerId: string;
  refundRequestId: string;
}): Promise<InstantRefundPerformResult> {
  const elig = await getLastPaymentInstantRefundEligibility(params.customerId);
  if (!elig.eligible) {
    return { ok: false, message: elig.message };
  }

  try {
    const refund = await stripe.refunds.create({
      charge: elig.chargeId,
      amount: elig.amountCents,
      reason: "requested_by_customer",
      metadata: {
        refund_request_id: params.refundRequestId,
        self_service: "true",
      },
    });

    const subs = await stripe.subscriptions.list({
      customer: params.customerId,
      status: "active",
    });

    for (const sub of subs.data) {
      await stripe.subscriptions.cancel(sub.id, { prorate: true });
    }

    return {
      ok: true,
      refundId: refund.id,
      refundedAmountDisplay: elig.amountDisplay,
      canceledSubscriptionCount: subs.data.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refund failed";
    return { ok: false, message };
  }
}
