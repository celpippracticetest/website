import Profile from "@/components/dashboard-new/Profile";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { auth, clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import {
  emailsFromClerkUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { normalizePlan } from "@/lib/subscriptionAccess";
import { redirect } from "next/navigation";
import Stripe from "stripe";

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
  let currentPeriodStart: number | undefined;
  let currentPeriodEnd: number | undefined;

  const terminal =
    sub.status === "canceled" || sub.status === "incomplete_expired";

  if (terminal && sub.current_period_end) {
    currentPeriodStart = sub.current_period_start ?? undefined;
    currentPeriodEnd = sub.current_period_end;
  } else if (sub.billing_cycle_anchor) {
    const anchorDate = new Date(sub.billing_cycle_anchor * 1000);
    const now = new Date();
    const weeksSinceAnchor = Math.floor(
      (now.getTime() - anchorDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    currentPeriodStart =
      sub.billing_cycle_anchor + weeksSinceAnchor * 7 * 24 * 60 * 60;
    currentPeriodEnd = currentPeriodStart + 7 * 24 * 60 * 60;
  } else if (sub.latest_invoice) {
    const invId =
      typeof sub.latest_invoice === "string"
        ? sub.latest_invoice
        : sub.latest_invoice.id;
    if (invId) {
      try {
        const invoice = await stripe.invoices.retrieve(invId);
        currentPeriodStart = invoice.period_start;
        currentPeriodEnd = invoice.period_end;
      } catch (invoiceError) {
        console.error("Error fetching invoice:", invoiceError);
      }
    }
  }

  if (currentPeriodEnd === undefined && sub.current_period_end) {
    currentPeriodStart = sub.current_period_start ?? undefined;
    currentPeriodEnd = sub.current_period_end;
  }

  const price = sub.items.data[0]?.price as Stripe.Price | undefined;
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
  });
  if (anySubscription.data.length > 0) {
    return null;
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
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  try {
    const userRepo = new CheckoutRepository(mongoClient);
    const prevCheckout = await userRepo.findLatestCheckoutByUserId(userId);

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const customerId = await resolveStripeCustomerId(userId, {
      clerkStripeCustomerId: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromClerkUser(user),
    });

    let subscriptionData: ProfileSubscriptionData | null = null;

    if (customerId) {
      try {
        subscriptionData = await resolveSubscriptionDataForCustomer(customerId);
      } catch (stripeError) {
        console.error("Error fetching subscription data:", stripeError);
      }
    }

    if (subscriptionData) {
      const lower = (subscriptionData.planName ?? "").toLowerCase();
      const fromStripe =
        /\bplus\b/.test(lower) ||
        lower.includes("premium plus") ||
        /\bpro\b/.test(lower)
          ? "pro"
          : "premium";
      const currentPlan = normalizePlan(user.publicMetadata?.plan as string);
      const alreadyPlusTier = currentPlan === "pro" || currentPlan === "plus";
      // Legacy Stripe products named only "Premium" must not downgrade migrated Plus (plan "plus"/"pro").
      const shouldBePlan =
        alreadyPlusTier && fromStripe === "premium"
          ? currentPlan === "plus"
            ? "plus"
            : "pro"
          : fromStripe;
      if (user.publicMetadata.plan !== shouldBePlan) {
        await client.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...user.publicMetadata,
            plan: shouldBePlan,
          },
        });
        user.publicMetadata.plan = shouldBePlan;
      }
    }

    return (
      <Profile
        user={JSON.parse(JSON.stringify(user))}
        prevCheckout={prevCheckout}
        subscriptionData={subscriptionData}
      />
    );
  } catch (error) {
    console.error("Unexpected error in profile page:", error);
    redirect("/");
  }
}
