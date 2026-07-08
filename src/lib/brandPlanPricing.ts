import { formatPlanCadPrice, parsePrice } from "@/lib/pricing";
import type { SerializedPlan } from "@/types/pricing";

export type PlanPeriodLabel = "weekly" | "monthly" | "quarterly";

export type PlanPriceDisplay = {
  price: string;
  priceSuffix: string;
  billingNote: string;
};

export function getPlanPriceDisplay(
  plan: SerializedPlan | null | undefined,
  period: PlanPeriodLabel,
): PlanPriceDisplay {
  if (!plan || parsePrice(plan.price) <= 0) {
    return { price: "—", priceSuffix: "", billingNote: "" };
  }

  const intro = formatPlanCadPrice(plan.price);
  const renewal = plan.oldPrice && parsePrice(plan.oldPrice) > 0
    ? formatPlanCadPrice(plan.oldPrice)
    : null;

  if (period === "weekly") {
    return {
      price: intro,
      priceSuffix: "/wk",
      billingNote: renewal ? `first week, then $${renewal}/wk` : "billed weekly, cancel anytime",
    };
  }

  if (period === "monthly") {
    return {
      price: intro,
      priceSuffix: "/mo",
      billingNote: renewal ? `first month, then $${renewal}/mo` : "billed monthly, cancel anytime",
    };
  }

  return {
    price: intro,
    priceSuffix: "",
    billingNote: renewal
      ? `first quarter, then $${renewal} every 3 months`
      : "billed every 3 months, cancel anytime",
  };
}
