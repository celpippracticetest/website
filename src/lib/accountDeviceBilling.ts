import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";
import { stripe } from "@/lib/stripe";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";

export async function canUseStripeDeviceSeatBilling(params: {
  userId: string;
  user: MobileUserBridge;
}): Promise<boolean> {
  const customerId = await resolveStripeCustomerId(params.userId, {
    stripeCustomerIdFromPrivate: params.user.privateMetadata?.stripeCustomerId as
      | string
      | undefined,
    emails: emailsFromAuthUser(params.user),
  });
  if (!customerId) return false;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 20,
  });
  const active = subscriptions.data.find((s) =>
    ["active", "trialing", "past_due", "unpaid"].includes(s.status),
  );
  return Boolean(active?.items?.data?.[0]);
}
