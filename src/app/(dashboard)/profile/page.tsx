import Profile from "@/components/dashboard-new/Profile";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import {
  listGooglePlaySubscriptionsForUser,
  planSourceIsGooglePlay,
  readPlanSource,
} from "@/lib/admin/googlePlayAdmin";
import { findLiveStripeSubscription } from "@/lib/stripe/liveSubscription";
import {
  formatPlanLabel,
  hasPaidPracticeAccess,
} from "@/lib/subscriptionAccess";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type ProfileSubscriptionData = {
  id?: string;
  status?: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  planId?: string;
  planName?: string;
  billingProvider?: "google_play";
};

function stripeProductName(product: unknown): string | undefined {
  if (product && typeof product === "object" && "name" in product) {
    const name = (product as { name?: unknown }).name;
    return typeof name === "string" ? name : undefined;
  }
  return undefined;
}

async function loadLiveStripeSubscriptionData(
  customerId: string,
): Promise<ProfileSubscriptionData | null> {
  const summary = await findLiveStripeSubscription(customerId);
  if (!summary) return null;

  const subscription = await stripe.subscriptions.retrieve(summary.id, {
    expand: ["items.data.price.product"],
  });
  const item = subscription.items.data[0];
  return {
    id: subscription.id,
    status: subscription.status,
    currentPeriodStart: item?.current_period_start,
    currentPeriodEnd: item?.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    planId: item?.price?.id,
    planName: stripeProductName(item?.price?.product),
  };
}

export default async function UserProfilePage() {
  const hybridUser = await getHybridCurrentUser();
  const userId = hybridUser?.userId;

  if (!userId) {
    redirect("/practice-overview");
  }

  let prevCheckout = null;
  let subscriptionData = null;
  let user = null;
  let billingProvider: "stripe" | "google_play" | null = null;
  let googlePlayCanCancel = false;

  try {
    const userRepo = new CheckoutRepository(documentsClient);
    prevCheckout = await userRepo.findLatestCheckoutByUserId(userId);

    const client = await appUserAdmin();
    user = await client.users.getUser(userId);
    const publicMeta = (user.publicMetadata || {}) as Record<string, unknown>;
    const playSubs = await listGooglePlaySubscriptionsForUser(userId);
    const isGooglePlay =
      playSubs.length > 0 || planSourceIsGooglePlay(readPlanSource(publicMeta));

    if (isGooglePlay) {
      billingProvider = "google_play";
      const planCancelled = Boolean(publicMeta.planCancelled);
      googlePlayCanCancel =
        !planCancelled &&
        (playSubs.length > 0 ||
          hasPaidPracticeAccess(
            typeof publicMeta.plan === "string" ? publicMeta.plan : null,
          ));
      const stillHasPlayAccess =
        googlePlayCanCancel ||
        hasPaidPracticeAccess(
          typeof publicMeta.plan === "string" ? publicMeta.plan : null,
        );
      const planLabel = hasPaidPracticeAccess(
        typeof publicMeta.plan === "string" ? publicMeta.plan : null,
      )
        ? formatPlanLabel(
            typeof publicMeta.plan === "string" ? publicMeta.plan : null,
            typeof publicMeta.planType === "string"
              ? publicMeta.planType
              : null,
          )
        : "Plus";
      if (stillHasPlayAccess) {
        subscriptionData = {
          planName: planLabel,
          cancelAtPeriodEnd: planCancelled,
          billingProvider: "google_play",
        };
      }
    }

    if (!isGooglePlay) {
      try {
        const customerIds: string[] = [];
        const fromMeta = user.privateMetadata?.stripeCustomerId;
        if (typeof fromMeta === "string" && fromMeta.trim()) {
          customerIds.push(fromMeta.trim());
        }

        const userEmail = user.emailAddresses?.[0]?.emailAddress;
        if (userEmail) {
          const customers = await stripe.customers.list({
            email: userEmail,
            limit: 5,
          });
          for (const customer of customers.data) {
            if (!customerIds.includes(customer.id)) {
              customerIds.push(customer.id);
            }
          }
        }

        for (const customerId of customerIds) {
          const live = await loadLiveStripeSubscriptionData(customerId);
          if (live) {
            subscriptionData = live;
            billingProvider = "stripe";
            break;
          }
        }
      } catch (stripeError) {
        console.error("Error fetching subscription data:", stripeError);
      }
    }
  } catch (error) {
    console.error("Unexpected error loading profile subscription data:", error);
    if (!user && hybridUser?.user) {
      user = hybridUser.user as NonNullable<typeof user>;
    }
  }

  if (!user) {
    redirect("/practice-overview");
  }

  const serverPlan =
    typeof user.publicMetadata?.plan === "string"
      ? user.publicMetadata.plan
      : "free";

  return (
    <Profile
      user={JSON.parse(JSON.stringify(user))}
      prevCheckout={prevCheckout}
      subscriptionData={subscriptionData}
      billingProvider={billingProvider}
      googlePlayCanCancel={googlePlayCanCancel}
      serverPlan={serverPlan}
      hasLiveStripeSubscription={
        billingProvider === "stripe" && Boolean(subscriptionData)
      }
    />
  );
}
