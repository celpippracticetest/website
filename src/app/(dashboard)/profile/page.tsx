import Profile from "@/components/dashboard-new/Profile";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { normalizePlan } from "@/lib/subscriptionAccess";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { getDashboardLayoutAuthContext } from "@/lib/auth/web-session-server";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Stripe product name for the profile label (handles product as id string when expand misses). */
async function resolveStripePlanDisplayName(
  price: Stripe.Price | undefined
): Promise<string | undefined> {
  if (!price) return undefined;
  const product = price.product;
  if (product && typeof product === "object" && "name" in product) {
    const name = (product as Stripe.Product).name;
    if (name?.trim()) return name.trim();
  }
  if (typeof product === "string") {
    try {
      const prod = await stripe.products.retrieve(product);
      if (prod.name?.trim()) return prod.name.trim();
    } catch {
      /* use nickname fallback below */
    }
  }
  const nick = price.nickname?.trim();
  return nick || undefined;
}

export type ProfileSubscriptionData = {
  id: string;
  status: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  planId?: string;
  planName?: string;
  isOneTimePayment?: boolean;
};

async function buildSubscriptionDataFromStripeSub(
  subscription: Stripe.Subscription
): Promise<ProfileSubscriptionData> {
  const sub = subscription;
  // In Stripe SDK v18+, current_period_* moved from Subscription to SubscriptionItem.
  const firstItem = sub.items.data[0];
  const currentPeriodStart = firstItem?.current_period_start ?? undefined;
  const currentPeriodEnd = firstItem?.current_period_end ?? undefined;

  const price = firstItem?.price as Stripe.Price | undefined;
  const planName = await resolveStripePlanDisplayName(price);

  return {
    id: sub.id,
    status: sub.status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    planId: price?.id,
    planName,
  };
}

/**
 * Uses only billable Stripe subscription statuses so canceled subs (e.g. canceled in Dashboard)
 * are not shown as renewing. If the customer has any subscription object but none billable,
 * skips the charges fallback so a past subscription payment is not shown as a fake renewal.
 */
async function resolveSubscriptionDataForCustomer(
  customerId: string
): Promise<ProfileSubscriptionData | null> {
  const billableStatuses = [
    "active",
    "trialing",
    "past_due",
    "unpaid",
  ] as const;

  for (const status of billableStatuses) {
    const { data } = await stripe.subscriptions.list({
      customer: customerId,
      status,
      limit: 1,
    });
    if (data[0]) {
      const subscription = await stripe.subscriptions.retrieve(data[0].id, {
        expand: ["items.data.price.product"],
      });
      return buildSubscriptionDataFromStripeSub(subscription);
    }
  }

  const anySubscription = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
  });
  if (anySubscription.data.length > 0) {
    const subscription = await stripe.subscriptions.retrieve(
      anySubscription.data[0].id,
      { expand: ["items.data.price.product"] }
    );
    return buildSubscriptionDataFromStripeSub(subscription);
  }

  const charges = await stripe.charges.list({ customer: customerId, limit: 1 });
  if (charges.data.length === 0) return null;

  const latestCharge = charges.data[0];
  if (latestCharge.status !== "succeeded") return null;

  const chargeDate = new Date(latestCharge.created * 1000);
  const endDate = new Date(chargeDate);
  endDate.setDate(endDate.getDate() + 30);

  return {
    id: latestCharge.id,
    status: "active",
    currentPeriodStart: latestCharge.created,
    currentPeriodEnd: Math.floor(endDate.getTime() / 1000),
    cancelAtPeriodEnd: false,
    planId: "one_time_payment",
    isOneTimePayment: true,
    planName: latestCharge.description || "One-time Payment",
  };
}

export default async function UserProfilePage() {
  const ctx = await getDashboardLayoutAuthContext();
  if (!ctx?.userId) {
    redirect("/sign-in");
  }

  const { userId, user: ctxUser } = ctx;

  try {
    const userRepo = new CheckoutRepository(mongoClient);
    const prevCheckout = await userRepo.findLatestCheckoutByUserId(userId);

    // For Supabase-only users (UUID) skip the Clerk API — use the bridge user directly.
    const isSupabaseUser = isLikelySupabaseAuthUserId(userId);

    let clerkUser: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>> | null = null;
    if (!isSupabaseUser) {
      try {
        const client = await clerkClient();
        clerkUser = await client.users.getUser(userId);
      } catch {
        // Clerk user not found — fall through to Supabase bridge
      }
    }

    // Use Clerk user if available, otherwise fall back to the Supabase bridge (ctxUser)
    const userForStripe = clerkUser ?? ctxUser;

    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: userForStripe.privateMetadata?.stripeCustomerId as string | undefined,
      emails: emailsFromClerkUser(userForStripe),
    });

    let subscriptionData: ProfileSubscriptionData | null = null;

    if (customerId) {
      try {
        subscriptionData = await resolveSubscriptionDataForCustomer(customerId);
      } catch (stripeError) {
        console.error("Error fetching subscription data:", stripeError);
      }
    }

    // Only sync Clerk metadata for Clerk-backed accounts
    if (clerkUser && subscriptionData) {
      const client = await clerkClient();
      const lower = (subscriptionData.planName ?? "").toLowerCase();
      const fromStripe =
        /\bplus\b/.test(lower) ||
        lower.includes("premium plus") ||
        /\bpro\b/.test(lower)
          ? "pro"
          : "premium";
      const currentPlan = normalizePlan(clerkUser.publicMetadata?.plan as string);
      const alreadyPlusTier = currentPlan === "pro" || currentPlan === "plus";
      const shouldBePlan =
        alreadyPlusTier && fromStripe === "premium"
          ? currentPlan === "plus"
            ? "plus"
            : "pro"
          : fromStripe;
      if (clerkUser.publicMetadata.plan !== shouldBePlan) {
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...clerkUser.publicMetadata,
            plan: shouldBePlan,
          },
        });
      }
    }

    return (
      <Profile
        prevCheckout={prevCheckout}
        subscriptionData={subscriptionData}
      />
    );
  } catch (error) {
    console.error("Unexpected error in profile page:", error);
    redirect("/");
  }
}
