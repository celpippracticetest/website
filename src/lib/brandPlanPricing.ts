import type { SerializedPlan } from "@/types/pricing";
import { parsePrice } from "@/lib/pricing";
import {
  discountedUnitAmountCents,
  parseMoneyToCents,
} from "@/lib/sitewidePlanDiscount";

export type PlanPeriodLabel = "weekly" | "monthly" | "quarterly";

export type FeaturedPlanName = "Weekly" | "Monthly" | "Quarterly";

export type PlanPriceDisplay = {
  price: string;
  /** List price before the sitewide discount, e.g. "$19.99". */
  compareAtPrice: string | null;
  priceSuffix: string;
  /** e.g. "≈ $12.50 per week" */
  perWeekEquivalent: string;
  /** e.g. "SAVE 37%" — longer plans vs weekly. */
  saveLabel: string | null;
  /** e.g. "30% OFF" */
  saleLabel: string | null;
};

/** List prices before the sitewide discount. Matches Pricing.dc.html. */
const CATALOG_DISPLAY: Record<
  PlanPeriodLabel,
  { price: string; priceSuffix: string }
> = {
  weekly: { price: "$19.99", priceSuffix: "/ week" },
  monthly: { price: "$49.99", priceSuffix: "/ month" },
  quarterly: { price: "$95.99", priceSuffix: "/ 3 months" },
};

function formatInrAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function savePercentVsWeekly(weeklySaleCents: number, weeks: number, salePriceCents: number): number {
  const baseline = weeklySaleCents * weeks;
  if (baseline <= salePriceCents || baseline <= 0) return 0;
  return Math.round(((baseline - salePriceCents) / baseline) * 100);
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
    /** 0 = current list price. 30 = sitewide sale. */
    discountPercent?: number;
  },
): PlanPriceDisplay {
  const showPerWeek = options?.showPerWeek ?? true;
  const discountPercent = options?.discountPercent ?? 0;
  const catalog = CATALOG_DISPLAY[period];
  const currency = plan?.currency?.toLowerCase();
  const saleLabel =
    discountPercent > 0 ? `${discountPercent}% OFF` : null;

  function saleCents(listCents: number): number {
    if (discountPercent <= 0) return listCents;
    return discountedUnitAmountCents(listCents, discountPercent);
  }

  if (currency === "inr" && plan?.price) {
    const listAmount = parsePrice(plan.price);
    const listCents = Math.round(listAmount * 100);
    const amountCents = saleCents(listCents);
    const weeklyList =
      options?.weeklyPlan?.currency?.toLowerCase() === "inr" && options.weeklyPlan.price
        ? parsePrice(options.weeklyPlan.price)
        : 0;
    const weeklySaleCents = saleCents(Math.round(weeklyList * 100));
    const weeks = weeksInPeriod(period);
    let saveLabel: string | null = null;
    let perWeekEquivalent = "";

    if (period !== "weekly" && weeklySaleCents > 0 && amountCents > 0) {
      const off = savePercentVsWeekly(weeklySaleCents, weeks, amountCents);
      if (off > 0) saveLabel = `SAVE ${off}%`;
      if (showPerWeek) {
        perWeekEquivalent = `≈ ${formatInrAmount(amountCents / weeks / 100)} per week`;
      }
    }

    return {
      price: formatInrAmount(amountCents / 100),
      compareAtPrice:
        discountPercent > 0 && listAmount > 0
          ? formatInrAmount(listAmount)
          : null,
      priceSuffix: catalog.priceSuffix,
      perWeekEquivalent,
      saveLabel,
      saleLabel: listAmount > 0 ? saleLabel : null,
    };
  }

  const listCents = parseMoneyToCents(catalog.price);
  const amountCents = saleCents(listCents);
  const weeklySaleCents = saleCents(parseMoneyToCents(CATALOG_DISPLAY.weekly.price));
  const weeks = weeksInPeriod(period);
  let saveLabel: string | null = null;
  let perWeekEquivalent = "";

  if (period !== "weekly") {
    const off = savePercentVsWeekly(weeklySaleCents, weeks, amountCents);
    if (off > 0) saveLabel = `SAVE ${off}%`;
    if (showPerWeek) {
      perWeekEquivalent = `≈ ${formatUsdFromCents(Math.round(amountCents / weeks))} per week`;
    }
  }

  return {
    price: formatUsdFromCents(amountCents),
    compareAtPrice:
      discountPercent > 0 ? formatUsdFromCents(listCents) : null,
    priceSuffix: catalog.priceSuffix,
    perWeekEquivalent,
    saveLabel,
    saleLabel,
  };
}

export function getFeaturedBadge(planName: FeaturedPlanName): string {
  return planName === "Quarterly" ? "BEST VALUE" : "MOST POPULAR";
}
