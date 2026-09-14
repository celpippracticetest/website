import type { SerializedPlan } from "@/types/pricing";
import { parsePrice } from "@/lib/pricing";

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

function formatInrAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function weeksInPeriod(period: PlanPeriodLabel): number {
  if (period === "weekly") return 1;
  if (period === "monthly") return 4;
  return 12;
}

export function getPlanPriceDisplay(
  plan: SerializedPlan | null | undefined,
  period: PlanPeriodLabel,
  options?: {
    weeklyPlan?: SerializedPlan | null;
    showPerWeek?: boolean;
  },
): PlanPriceDisplay {
  const showPerWeek = options?.showPerWeek ?? true;
  const catalog = CATALOG_DISPLAY[period];
  const currency = plan?.currency?.toLowerCase();

  if (currency === "inr" && plan?.price) {
    const amount = parsePrice(plan.price);
    const weeklyAmount =
      options?.weeklyPlan?.currency?.toLowerCase() === "inr" && options.weeklyPlan.price
        ? parsePrice(options.weeklyPlan.price)
        : 0;
    const weeks = weeksInPeriod(period);
    let saveLabel: string | null = null;
    let perWeekEquivalent = "";

    if (period !== "weekly" && weeklyAmount > 0 && amount > 0) {
      const baseline = weeklyAmount * weeks;
      if (baseline > amount) {
        const off = Math.round(((baseline - amount) / baseline) * 100);
        if (off > 0) saveLabel = `SAVE ${off}%`;
      }
      if (showPerWeek) {
        const perWeek = amount / weeks;
        perWeekEquivalent = `≈ ${formatInrAmount(perWeek)} per week`;
      }
    }

    return {
      price: formatInrAmount(amount),
      priceSuffix: catalog.priceSuffix,
      perWeekEquivalent,
      saveLabel,
    };
  }

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
