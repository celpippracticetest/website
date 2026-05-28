import type { AppDocumentsDb as Db } from "@/lib/pg/types";
import type { Plan } from "@/models/plans.model";
import { getPlanRecurringConfig } from "@/lib/planBilling";
import {
  getPlanTemplateById,
  type PlanTemplate,
} from "@/lib/pricingCatalog";
import type { DurationGroupKey } from "@/types/pricing";
import { PlansRepository } from "@/repositories/plans.repo";
import { stripe } from "@/lib/stripe";

/** Next tier upsell after a successful purchase (catalog template ids). */
const UPGRADE_TARGET_BY_TEMPLATE: Partial<Record<string, string>> = {
  "weekly-plus": "monthly-plus",
  "monthly-plus": "three-month-plus",
  "three-month-plus": "yearly-plus",
  "weekly-premium-plus": "monthly-plus",
  "monthly-premium-plus": "three-month-plus",
  "three-month-premium-plus": "yearly-plus",
  "weekly-premium": "monthly-plus",
  "monthly-premium": "three-month-plus",
  "three-month-premium": "yearly-plus",
  "yearly-premium": "yearly-plus",
  "yearly-premium-plus": "yearly-plus",
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
  /** `publicMetadata.plan` — paid upgrades always use `plus`. */
  webPlanKey: "plus";
};

function billingPlanPhrase(template: PlanTemplate): string {
  if (template.billingInterval === "week") return "weekly plan";
  if (template.billingInterval === "year") return "yearly plan";
  if (template.billingInterval === "month" && template.billingIntervalCount === 3) {
    return "3-month plan";
  }
  return "monthly plan";
}

function templateIdFromDuration(durationKey: DurationGroupKey): string {
  const d = durationKey === "threeMonth" ? "three-month" : durationKey;
  return `${d}-plus`;
}

export function inferCatalogTemplateIdFromPlan(plan: Plan): string | null {
  const recurring = getPlanRecurringConfig(plan);
  let durationKey: DurationGroupKey;
  if (recurring.interval === "week") durationKey = "weekly";
  else if (recurring.interval === "month" && recurring.interval_count === 3)
    durationKey = "threeMonth";
  else if (recurring.interval === "year") durationKey = "yearly";
  else durationKey = "monthly";

  const templateId = templateIdFromDuration(durationKey);
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
  opts: { webUserId: string; userEmail?: string | null }
): Promise<ResolvedSuccessUpgrade | null> {
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

  if (session.status !== "complete") return null;
  if (!sessionBelongsToUser(session, opts.webUserId, opts.userEmail ?? undefined))
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
  return resolveSuccessUpgradeOfferFromSourcePrice(
    sourcePrice.id,
    db,
    checkoutSessionId
  );
}

export async function resolveSuccessUpgradeOfferFromSourcePrice(
  sourcePriceId: string,
  db: Db,
  sourceReferenceId: string
): Promise<ResolvedSuccessUpgrade | null> {
  const sourcePrice = await stripe.prices.retrieve(sourcePriceId);
  if (!sourcePrice?.active || !sourcePrice.recurring) return null;

  const sourceUnitCents = sourcePrice.unit_amount;
  const currency = (sourcePrice.currency || "cad").toLowerCase();
  if (sourceUnitCents == null || sourceUnitCents < 0) return null;
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
    successSessionId: sourceReferenceId,
    sourcePlanTitle,
    targetPlanTitle,
    targetPlanSummary: `Plus · ${targetTemplate.planTitle}`,
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
    webPlanKey: "plus",
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
