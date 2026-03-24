import type { Db } from "mongodb";
import type { Plan } from "@/models/plans.model";
import { getPlanRecurringConfig } from "@/lib/planBilling";
import {
  getPlanTemplateById,
  type PlanTemplate,
} from "@/lib/pricingCatalog";
import type { AccessTierKey, DurationGroupKey } from "@/types/pricing";
import { PlansRepository } from "@/repositories/plans.repo";
import { stripe } from "@/lib/stripe";

/** Next tier upsell after a successful purchase (catalog template ids). */
const UPGRADE_TARGET_BY_TEMPLATE: Partial<Record<string, string>> = {
  "weekly-premium": "monthly-premium-plus",
  "weekly-premium-plus": "monthly-premium-plus",
  "monthly-premium": "monthly-premium-plus",
  "monthly-premium-plus": "three-month-premium-plus",
  "three-month-premium": "three-month-premium-plus",
  "three-month-premium-plus": "yearly-premium-plus",
  "yearly-premium": "yearly-premium-plus",
};

export type SuccessUpgradeOfferForClient = {
  sourcePlanTitle: string;
  targetPlanTitle: string;
  targetPlanSummary: string;
  promoFirstPeriodDisplay: string;
  /** Full list price for one period of the upgraded plan (for “instead of …”). */
  fullRegularUnitDisplay: string;
  /** e.g. "monthly plan", "3-month plan", "yearly plan" — from upgrade billing cadence. */
  targetBillingPlanPhrase: string;
  promoExplanation: string;
  successSessionId: string;
};

export type ResolvedSuccessUpgrade = SuccessUpgradeOfferForClient & {
  targetPriceId: string;
  targetUnitCents: number;
  sourceUnitCents: number;
  firstPeriodCents: number;
  discountOffCents: number;
  currency: string;
  /** Clerk `publicMetadata.plan` — app treats `pro` as Premium Plus (mock exams, etc.). */
  clerkPlanKey: "pro" | "premium";
};

function billingPlanPhrase(template: PlanTemplate): string {
  if (template.billingInterval === "week") return "weekly plan";
  if (template.billingInterval === "year") return "yearly plan";
  if (template.billingInterval === "month" && template.billingIntervalCount === 3) {
    return "3-month plan";
  }
  return "monthly plan";
}

function templateIdFromDurationAndTier(
  durationKey: DurationGroupKey,
  accessTier: AccessTierKey
): string {
  const d =
    durationKey === "threeMonth" ? "three-month" : durationKey;
  const t = accessTier === "premiumPlus" ? "premium-plus" : "premium";
  return `${d}-${t}`;
}

export function inferCatalogTemplateIdFromPlan(plan: Plan): string | null {
  const recurring = getPlanRecurringConfig(plan);
  const text = `${plan.title} ${plan.planTitle} ${plan.type}`.toLowerCase();
  const isPlus = /\bplus\b/.test(text);

  let durationKey: DurationGroupKey;
  if (recurring.interval === "week") durationKey = "weekly";
  else if (recurring.interval === "month" && recurring.interval_count === 3)
    durationKey = "threeMonth";
  else if (recurring.interval === "year") durationKey = "yearly";
  else durationKey = "monthly";

  const accessTier: AccessTierKey = isPlus ? "premiumPlus" : "premium";
  const templateId = templateIdFromDurationAndTier(durationKey, accessTier);
  return getPlanTemplateById(templateId) ? templateId : null;
}

async function findActivePlanForTemplate(
  db: Db,
  templateId: string
): Promise<Plan | null> {
  const repo = new PlansRepository(db);
  const plans = await repo.getActivePlans();
  const matches = plans.filter(
    (p) => inferCatalogTemplateIdFromPlan(p) === templateId
  );
  matches.sort(
    (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
  );
  return (matches[0] as Plan | undefined) ?? null;
}

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode.toUpperCase()}`;
  }
}

function sessionBelongsToUser(
  session: {
    metadata?: Record<string, string | undefined> | null;
    customer_details?: { email?: string | null } | null;
  },
  userId: string,
  userEmail: string | undefined
): boolean {
  const metaUid = session.metadata?.user_id?.trim();
  if (metaUid && metaUid === userId) return true;
  const sessionEmail = session.customer_details?.email?.trim().toLowerCase();
  const u = userEmail?.trim().toLowerCase();
  if (sessionEmail && u && sessionEmail === u) return true;
  return false;
}

export async function resolveSuccessUpgradeOffer(
  checkoutSessionId: string,
  db: Db,
  opts: { clerkUserId: string; clerkEmail?: string | null }
): Promise<ResolvedSuccessUpgrade | null> {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

  if (session.status !== "complete") return null;
  if (!sessionBelongsToUser(session, opts.clerkUserId, opts.clerkEmail ?? undefined))
    return null;

  const { data: lineItems } = await stripe.checkout.sessions.listLineItems(
    checkoutSessionId,
    { limit: 5, expand: ["data.price"] }
  );

  const first = lineItems[0];
  const priceRaw = first?.price;
  if (!priceRaw || typeof priceRaw === "string") return null;

  const sourcePrice = priceRaw;
  if (!sourcePrice.recurring) return null;

  const sourceUnitCents = sourcePrice.unit_amount;
  const currency = (sourcePrice.currency || "cad").toLowerCase();
  if (sourceUnitCents == null || sourceUnitCents < 0) return null;

  const sourcePriceId = sourcePrice.id;
  const repo = new PlansRepository(db);
  const sourcePlan = await repo.findActivePlanByStripePriceId(sourcePriceId);
  if (!sourcePlan?.stripePriceId) return null;

  const sourceTemplateId = inferCatalogTemplateIdFromPlan(sourcePlan);
  if (!sourceTemplateId) return null;

  const targetTemplateId = UPGRADE_TARGET_BY_TEMPLATE[sourceTemplateId];
  if (!targetTemplateId) return null;

  const targetPlan = await findActivePlanForTemplate(db, targetTemplateId);
  if (!targetPlan?.stripePriceId?.trim()) return null;

  const targetStripePrice = await stripe.prices.retrieve(
    targetPlan.stripePriceId.trim()
  );
  if (!targetStripePrice.active || !targetStripePrice.recurring) return null;

  const targetUnitCents = targetStripePrice.unit_amount;
  if (targetUnitCents == null) return null;

  if ((targetStripePrice.currency || "").toLowerCase() !== currency) return null;

  const deltaCents = targetUnitCents - sourceUnitCents;
  if (deltaCents <= 0) return null;

  const firstPeriodCents = Math.round(deltaCents / 2);
  if (firstPeriodCents <= 0) return null;

  const discountOffCents = targetUnitCents - firstPeriodCents;
  if (discountOffCents <= 0 || discountOffCents >= targetUnitCents) return null;

  const targetTemplate = getPlanTemplateById(targetTemplateId);
  if (!targetTemplate) return null;

  const targetPlanTitle = targetPlan.title?.trim() || targetTemplate.title;
  const sourcePlanTitle =
    sourcePlan.title?.trim() || getPlanTemplateById(sourceTemplateId)?.title || "Your plan";

  const promoFirstPeriodDisplay = formatMoney(
    firstPeriodCents / 100,
    currency
  );
  const fullRegularUnitDisplay = formatMoney(
    targetUnitCents / 100,
    currency
  );

  return {
    successSessionId: checkoutSessionId,
    sourcePlanTitle,
    targetPlanTitle,
    targetPlanSummary: `${targetTemplate.accessTier === "premiumPlus" ? "Premium Plus" : "Premium"} · ${targetTemplate.planTitle}`,
    promoFirstPeriodDisplay,
    fullRegularUnitDisplay,
    targetBillingPlanPhrase: billingPlanPhrase(targetTemplate),
    promoExplanation:
      "50% off the upgrade difference for your first billing period only. After that, the regular price applies.",
    targetPriceId: targetStripePrice.id,
    targetUnitCents,
    sourceUnitCents,
    firstPeriodCents,
    discountOffCents,
    currency,
    clerkPlanKey:
      targetTemplate.accessTier === "premiumPlus" ? "pro" : "premium",
  };
}

export function toClientUpgradeOffer(
  resolved: ResolvedSuccessUpgrade
): SuccessUpgradeOfferForClient {
  return {
    successSessionId: resolved.successSessionId,
    sourcePlanTitle: resolved.sourcePlanTitle,
    targetPlanTitle: resolved.targetPlanTitle,
    targetPlanSummary: resolved.targetPlanSummary,
    promoFirstPeriodDisplay: resolved.promoFirstPeriodDisplay,
    fullRegularUnitDisplay: resolved.fullRegularUnitDisplay,
    targetBillingPlanPhrase: resolved.targetBillingPlanPhrase,
    promoExplanation: resolved.promoExplanation,
  };
}
