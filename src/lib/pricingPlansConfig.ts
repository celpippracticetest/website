import pricingPlansJson from "@/config/pricing-plans.json";
import { PRICING_PLUS_FEATURE_LABELS } from "@/lib/pricing";
import { getPlanTemplateById } from "@/lib/pricingCatalog";
import type { SerializedPlan } from "@/types/pricing";

export type PricingPlanConfigEntry = {
  /** Matches `id` in `src/lib/pricingCatalog.ts` plan templates (e.g. `weekly-plus`). */
  id: string;
  /** Stripe Price id (`price_…`). Live amount is loaded from Stripe at runtime. */
  stripePriceId: string;
  order?: number;
  /** Defaults to true. Set false to hide a plan without removing it from the file. */
  active?: boolean;
};

type PricingPlansConfig = {
  plans: PricingPlanConfigEntry[];
};

/**
 * Builds the marketing/checkout plan catalog from `src/config/pricing-plans.json`
 * plus display metadata from `pricingCatalog.ts`.
 */
export function getSerializedPlansFromConfig(): SerializedPlan[] {
  const config = pricingPlansJson as PricingPlansConfig;

  const plans = config.plans
    .filter((entry) => entry.active !== false)
    .map((entry): SerializedPlan | null => {
      const template = getPlanTemplateById(entry.id);
      if (!template) {
        console.warn(`pricing-plans.json: unknown plan id "${entry.id}"`);
        return null;
      }

      const stripePriceId = entry.stripePriceId?.trim() ?? "";
      if (!stripePriceId) {
        return null;
      }

      return {
        _id: entry.id,
        title: template.title,
        type: template.type,
        planTitle: template.planTitle,
        oldPrice: "",
        price: "0",
        discount: "",
        buttonTitle: template.buttonTitle,
        features: [...PRICING_PLUS_FEATURE_LABELS],
        billingInterval: template.billingInterval,
        billingIntervalCount: template.billingIntervalCount,
        stripePriceId,
        iconType: template.iconType,
        iconWrapperColor: template.iconWrapperColor,
        order: entry.order ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .filter((plan): plan is SerializedPlan => plan != null);

  return [...plans].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

/** Resolve a config entry by Stripe Price id (checkout, webhooks, PayPal). */
export function findConfigPlanByStripePriceId(priceId: string): PricingPlanConfigEntry | null {
  const safe = priceId?.trim();
  if (!safe) return null;
  const config = pricingPlansJson as PricingPlansConfig;
  return config.plans.find((p) => p.stripePriceId?.trim() === safe) ?? null;
}
