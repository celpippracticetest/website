import DashboardHome from "@/components/dashboard-app/dashboardHome";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { PlansRepository } from "@/repositories/plans.repo";
import {
  resolveSuccessUpgradeOfferFromSourcePrice,
  toClientUpgradeOffer,
  type SuccessUpgradeOfferForClient,
} from "@/lib/successPageUpgrade";
import { resolvePayPalPlanIdForStripePrice } from "@/lib/paypal/planMap";
import { finalizePayPalSubscriptionReturn } from "@/lib/paypal/finalizeSubscriptionReturn";

export default async function PayPalSuccessPage({ searchParams }: any) {
  const params = searchParams ? await searchParams : {};
  const rawSubscriptionId = params?.subscription_id;
  const subscriptionId =
    typeof rawSubscriptionId === "string" && /^I-[A-Z0-9]+$/i.test(rawSubscriptionId.trim())
      ? rawSubscriptionId.trim()
      : "-";

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  if (subscriptionId !== "-") {
    try {
      await finalizePayPalSubscriptionReturn({
        clerkUserId: user.id,
        subscriptionId,
      });
    } catch (err) {
      console.error("[success/paypal] finalize retry failed", err);
    }
  }

  const client = await clerkClient();
  const freshUser = await client.users.getUser(user.id);
  const publicMetadata = (freshUser.publicMetadata || {}) as Record<string, unknown>;
  const purchaseAmountRaw = Number(publicMetadata.purchaseAmount);
  const purchaseAmount = Number.isFinite(purchaseAmountRaw) ? purchaseAmountRaw : 0;
  const purchaseCurrencyRaw = String(publicMetadata.purchaseCurrency || "CAD").trim();
  const purchaseCurrency = purchaseCurrencyRaw || "CAD";
  let upgradeOffer: SuccessUpgradeOfferForClient | null = null;

  if (subscriptionId !== "-") {
    try {
      const db = await getDb();
      const pending = await db.collection("paypal_subscription_pending").findOne<{
        stripePriceId?: string;
        clerkUserId?: string;
      }>({
        clerkUserId: user.id,
        paypalSubscriptionId: subscriptionId,
      });
      const sourceStripePriceId = pending?.stripePriceId?.trim();
      if (sourceStripePriceId) {
        const plansRepo = new PlansRepository(db);
        const resolved = await resolveSuccessUpgradeOfferFromSourcePrice(
          sourceStripePriceId,
          db,
          subscriptionId
        );
        const sourcePlan = await plansRepo.findActivePlanByStripePriceId(sourceStripePriceId);
        const targetPlan = resolved
          ? await plansRepo.findActivePlanByStripePriceId(resolved.targetPriceId)
          : null;
        const samePayPalProduct =
          !sourcePlan?.paypalProductId ||
          !targetPlan?.paypalProductId ||
          sourcePlan.paypalProductId === targetPlan.paypalProductId;
        const targetPayPalPlanId = resolved
          ? await resolvePayPalPlanIdForStripePrice(resolved.targetPriceId)
          : null;
        if (resolved && targetPayPalPlanId && samePayPalProduct) {
          upgradeOffer = toClientUpgradeOffer(resolved);
        }
      }
    } catch (err) {
      console.error("[success/paypal] upgrade offer:", err);
    }
  }

  const sessionData = {
    payment_method_types: ["paypal"],
    customer_email: user.primaryEmailAddress?.emailAddress ?? null,
    amount_total: Math.max(0, Math.round(purchaseAmount * 100)),
    currency: purchaseCurrency.toLowerCase(),
    invoice: subscriptionId,
  };

  return (
    <div className="bg-[#F4F7FF] min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
      <DashboardHome
        session={sessionData}
        email={user.primaryEmailAddress?.emailAddress ?? null}
        upgradeOffer={upgradeOffer}
      />
    </div>
  );
}
