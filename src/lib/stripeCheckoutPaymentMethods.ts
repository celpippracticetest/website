import "server-only";

import type Stripe from "stripe";

/**
 * Stripe-hosted Checkout payment methods.
 *
 * **Default:** send neither `payment_method_types` nor a configuration, so Stripe shows the
 * methods enabled in the Dashboard for the customer's country/currency (cards, wallets, UPI…).
 * Some of those settle asynchronously — the webhook grants access only once the session is
 * paid (`checkout.session.async_payment_succeeded` for delayed methods).
 *
 * **Overrides:** `STRIPE_CHECKOUT_PAYMENT_METHOD_CONFIGURATION` (a Dashboard Payment Method
 * Configuration id, `pmc_...`) or `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES` (comma-separated).
 */
export function stripeCheckoutPaymentMethodTypes():
  | Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
  | undefined {
  const raw = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES?.trim();
  if (!raw) return undefined;
  const types = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  return types.length > 0 ? types : undefined;
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
  const types = stripeCheckoutPaymentMethodTypes();
  return types ? { payment_method_types: types } : {};
}
