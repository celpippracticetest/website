import "server-only";

import { stripe } from "@/lib/stripe";
import { resolveStripeCustomerId } from "@/lib/resolveStripeCustomerId";
import {
  listGooglePlaySubscriptionsForUser,
  planSourceIsApple,
  planSourceIsGooglePlay,
  planSourceIsStripe,
  readPlanSource,
} from "@/lib/admin/googlePlayAdmin";

export type AdminBillingProvider =
  | "stripe"
  | "google_play"
  | "apple"
  | "paypal"
  | "admin"
  | "unknown"
  | "none";

export type AdminBillingSource = {
  provider: AdminBillingProvider;
  label: string;
  stripeCustomerId: string | null;
  stripeSubscriptionActive: boolean;
  googlePlaySubscriptionActive: boolean;
  googlePlayCanCancel: boolean;
};

const PROVIDER_LABEL: Record<AdminBillingProvider, string> = {
  stripe: "Stripe",
  google_play: "Google Play",
  apple: "Apple",
  paypal: "PayPal",
  admin: "Manual / admin",
  unknown: "Unknown",
  none: "None",
};

async function hasActiveStripeSubscription(
  customerId: string | null
): Promise<boolean> {
  if (!customerId) return false;
  const [active, trialing] = await Promise.all([
    stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    }),
    stripe.subscriptions.list({
      customer: customerId,
      status: "trialing",
      limit: 1,
    }),
  ]);
  return active.data.length > 0 || trialing.data.length > 0;
}

export async function resolveAdminBillingSource(args: {
  userId: string;
  supabaseAuthUserId?: string | null;
  emails: string[];
  stripeCustomerIdHint?: string | null;
  publicMetadata: Record<string, unknown>;
  paidPlan: boolean;
}): Promise<AdminBillingSource> {
  const playSubs = await listGooglePlaySubscriptionsForUser(
    args.supabaseAuthUserId || args.userId
  );
  const googlePlaySubscriptionActive = playSubs.length > 0;
  const planSource = readPlanSource(args.publicMetadata);
  const paymentProvider = String(
    args.publicMetadata.paymentProvider ?? ""
  ).toLowerCase();

  let stripeCustomerId: string | null = null;
  try {
    stripeCustomerId = await resolveStripeCustomerId(args.userId, {
      stripeCustomerIdFromPrivate: args.stripeCustomerIdHint,
      emails: args.emails,
    });
  } catch {
    stripeCustomerId = args.stripeCustomerIdHint?.trim() || null;
  }
  if (!stripeCustomerId && args.supabaseAuthUserId) {
    try {
      stripeCustomerId = await resolveStripeCustomerId(args.supabaseAuthUserId, {
        stripeCustomerIdFromPrivate: args.stripeCustomerIdHint,
        emails: args.emails,
      });
    } catch {
      // keep hint
    }
  }

  let stripeSubscriptionActive = false;
  try {
    stripeSubscriptionActive = await hasActiveStripeSubscription(stripeCustomerId);
  } catch {
    stripeSubscriptionActive = false;
  }

  const googlePlayCanCancel =
    googlePlaySubscriptionActive || planSourceIsGooglePlay(planSource);

  let provider: AdminBillingProvider = "none";
  if (googlePlaySubscriptionActive || planSourceIsGooglePlay(planSource)) {
    provider = "google_play";
  } else if (stripeSubscriptionActive || planSourceIsStripe(planSource)) {
    provider = "stripe";
  } else if (planSourceIsApple(planSource) || paymentProvider === "apple") {
    provider = "apple";
  } else if (paymentProvider === "paypal" || planSource === "paypal") {
    provider = "paypal";
  } else if (args.paidPlan && stripeCustomerId) {
    provider = "stripe";
  } else if (args.paidPlan && String(planSource || "").toLowerCase() === "admin") {
    provider = "admin";
  } else if (args.paidPlan) {
    provider = "unknown";
  }

  let label = PROVIDER_LABEL[provider];
  if (provider === "stripe" && stripeCustomerId && !stripeSubscriptionActive) {
    label = "Stripe (no active sub)";
  }
  if (provider === "google_play" && !googlePlaySubscriptionActive) {
    label = "Google Play";
  }
  if (provider === "unknown") {
    label = "Unknown (not Stripe or Play)";
  }

  return {
    provider,
    label,
    stripeCustomerId,
    stripeSubscriptionActive,
    googlePlaySubscriptionActive,
    googlePlayCanCancel,
  };
}
