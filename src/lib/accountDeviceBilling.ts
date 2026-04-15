import type { User } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";

export async function canUseStripeDeviceSeatBilling(params: {
  userId: string;
  user: User;
}): Promise<boolean> {
  const customerId = await resolveStripeCustomerId(params.userId, {
    clerkStripeCustomerId: params.user.privateMetadata?.stripeCustomerId as
      | string
      | undefined,
    emails: emailsFromClerkUser(params.user),
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
