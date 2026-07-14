import type { SerializedPlan } from "@/types/pricing";

export type PlanPeriodLabel = "weekly" | "monthly" | "quarterly";

export type FeaturedPlanName = "Weekly" | "Monthly" | "Quarterly";

export type PlanPriceDisplay = {
  price: string;
  priceSuffix: string;
  /** e.g. "≈ $12.50 per week" */
  perWeekEquivalent: string;
  /** e.g. "SAVE 37%" */
  saveLabel: string | null;
};

/** Marketing display values — matches Pricing.dc.html / design handoff. */
const CATALOG_DISPLAY: Record<
  PlanPeriodLabel,
  {
    price: string;
    priceSuffix: string;
    perWeekEquivalent: string;
    saveLabel: string | null;
  }
> = {
  weekly: {
    price: "$19.99",
    priceSuffix: "/ week",
    perWeekEquivalent: "",
    saveLabel: null,
  },
  monthly: {
    price: "$49.99",
    priceSuffix: "/ month",
    perWeekEquivalent: "≈ $12.50 per week",
    saveLabel: "SAVE 37%",
  },
  quarterly: {
    price: "$95.99",
    priceSuffix: "/ 3 months",
    perWeekEquivalent: "≈ $8.00 per week",
    saveLabel: "SAVE 60%",
  },
};

export function getPlanPriceDisplay(
  _plan: SerializedPlan | null | undefined,
  period: PlanPeriodLabel,
  options?: {
    weeklyPlan?: SerializedPlan | null;
    showPerWeek?: boolean;
  },
): PlanPriceDisplay {
  const showPerWeek = options?.showPerWeek ?? true;
  const catalog = CATALOG_DISPLAY[period];

  return {
    price: catalog.price,
    priceSuffix: catalog.priceSuffix,
    perWeekEquivalent: showPerWeek ? catalog.perWeekEquivalent : "",
    saveLabel: catalog.saveLabel,
  };
}

export function getFeaturedBadge(planName: FeaturedPlanName): string {
  return planName === "Quarterly" ? "BEST VALUE" : "MOST POPULAR";
}
