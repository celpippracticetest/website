import 'server-only'

import Stripe from 'stripe'

// We use a getter to lazily initialize the Stripe client.
// This prevents the build from failing if STRIPE_SECRET_KEY is missing during build time.
let stripeInstance: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(target, prop, receiver) {
    if (!stripeInstance) {
      const apiKey = process.env.STRIPE_SECRET_KEY;
      if (!apiKey) {
        // If we're in production and trying to use Stripe, we should throw.
        // During build, we just return a placeholder or throw a more descriptive error.
        if (process.env.NODE_ENV === 'production') {
          throw new Error('STRIPE_SECRET_KEY is not defined');
        }
        // For non-production/build, we'll throw when a method is actually called.
        throw new Error('STRIPE_SECRET_KEY is missing. Stripe features are unavailable.');
      }
      stripeInstance = new Stripe(apiKey, {
        apiVersion: '2025-01-27.acacia', // Use the latest stable version or match existing
      });
    }
    return Reflect.get(stripeInstance, prop, receiver);
  }
});

// Also export a helper for cases where the Proxy might not be suitable
export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-01-27.acacia',
    });
  }
  return stripeInstance;
}
