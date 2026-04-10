import "server-only";

import type Stripe from "stripe";

/**
 * Payment methods on Stripe-hosted Checkout (card, PayPal, etc.).
 *
 * **Preferred:** set `STRIPE_CHECKOUT_PAYMENT_METHOD_CONFIGURATION` to your Dashboard
 * Payment Method Configuration id (`cpmt_...`). That reuses the exact methods you
 * configured (e.g. custom PayPal). Mutually exclusive with `payment_method_types` in
 * Stripe’s API.
 *
 * **Fallback:** if that env is unset, uses `payment_method_types` from
 * `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` (comma-separated) or defaults to `card,paypal`.
 */
export function stripeCheckoutPaymentMethodTypes(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const raw = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  }
  return ["card", "paypal"];
}

/** Spread into `stripe.checkout.sessions.create({ ... })`. */
export function stripeCheckoutPaymentMethodParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  "payment_method_types" | "payment_method_configuration"
> {
  const configId = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_CONFIGURATION?.trim();
  if (configId) {
    return { payment_method_configuration: configId };
  }
  return { payment_method_types: stripeCheckoutPaymentMethodTypes() };
}
