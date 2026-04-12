import "server-only";

import type Stripe from "stripe";

/**
 * Stripe-hosted Checkout payment methods only. PayPal on this product is a **separate**
 * flow (`/api/paypal/create-subscription`); do not rely on Stripe’s `paypal` type here
 * unless you deliberately enable and configure it.
 *
 * **Preferred:** set `STRIPE_CHECKOUT_PAYMENT_METHOD_CONFIGURATION` to a Dashboard
 * Payment Method Configuration id (`cpmt_...`). Mutually exclusive with
 * `payment_method_types` in Stripe’s API.
 *
 * **Fallback:** `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` (comma-separated), or default `card`.
 */
export function stripeCheckoutPaymentMethodTypes(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const raw = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  }
  return ["card"];
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
