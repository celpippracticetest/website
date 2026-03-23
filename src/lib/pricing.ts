import type {
  AccessTierKey,
  DurationGroupKey,
  PlanBillingInterval,
  SerializedPlan,
} from "@/types/pricing";

function getPlanText(plan: Pick<SerializedPlan, "title" | "planTitle" | "type">) {
  return `${plan.title} ${plan.planTitle} ${plan.type}`.toLowerCase();
}

function getDurationGroupKeyFromName(
  plan: Pick<SerializedPlan, "title" | "planTitle" | "type">
): DurationGroupKey | null {
  const planText = getPlanText(plan);

  if (
    /(^|\s)3[\s-]?month/.test(planText) ||
    planText.includes("3 months") ||
    planText.includes("best seller")
  ) {
    return "threeMonth";
  }

  if (
    planText.includes("12 month") ||
    planText.includes("12 months") ||
    planText.includes("yearly") ||
    planText.includes("best value")
  ) {
    return "yearly";
  }

  if (planText.includes("weekly")) {
    return "weekly";
  }

  if (planText.includes("monthly") || planText.includes("easy start")) {
    return "monthly";
  }

  return null;
}

function getDurationGroupKeyFromBilling(plan: SerializedPlan): DurationGroupKey | null {
  if (plan.billingInterval === "month" && (plan.billingIntervalCount ?? 1) === 3) {
    return "threeMonth";
  }

  if (plan.billingInterval === "year" && (plan.billingIntervalCount ?? 1) === 1) {
    return "yearly";
  }

  if (plan.billingInterval === "week" && (plan.billingIntervalCount ?? 1) === 1) {
    return "weekly";
  }

  if (plan.billingInterval === "month" && (plan.billingIntervalCount ?? 1) === 1) {
    return "monthly";
  }

  return null;
}

export function parsePrice(value: string) {
  const numericValue = Number.parseFloat(value?.replace?.(/[^0-9.]/g, "") || "");
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function formatPlanCadPrice(value: string) {
  const numericValue = parsePrice(value);
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

export function isWeeklyPlan(plan: SerializedPlan) {
  return getDurationGroupKey(plan) === "weekly";
}

export function isMonthlyPlan(plan: SerializedPlan) {
  return getDurationGroupKey(plan) === "monthly";
}

export function isThreeMonthPlan(plan: SerializedPlan) {
  return getDurationGroupKey(plan) === "threeMonth";
}

export function isYearlyPlan(plan: SerializedPlan) {
  return getDurationGroupKey(plan) === "yearly";
}

export function hasMockExamFeature(plan: SerializedPlan) {
  return plan.features.some((feature) => /mock exam/i.test(feature));
}

export function isPremiumPlusPlan(plan: SerializedPlan) {
  const planText = getPlanText(plan);
  return (
    hasMockExamFeature(plan) ||
    isYearlyPlan(plan) ||
    plan.iconType === "BestValuePlan" ||
    planText.includes("best seller") ||
    planText.includes("best value") ||
    planText.includes("premium plus") ||
    planText.includes("pro")
  );
}

export function getDurationGroupKey(plan: SerializedPlan): DurationGroupKey | null {
  return getDurationGroupKeyFromName(plan) || getDurationGroupKeyFromBilling(plan);
}

export function getStablePlanId(plan: SerializedPlan, index: number) {
  return plan._id || `${index}`;
}

export function getAccessLabel(plan: SerializedPlan) {
  if (isPremiumPlusPlan(plan)) {
    return "Premium Plus";
  }

  if (
    isWeeklyPlan(plan) ||
    isMonthlyPlan(plan) ||
    isThreeMonthPlan(plan) ||
    isYearlyPlan(plan)
  ) {
    return "Premium";
  }

  return undefined;
}

export function getPlanButtonLabel(plan: SerializedPlan) {
  if (isPremiumPlusPlan(plan)) {
    return "Get Premium Plus";
  }

  if (
    isWeeklyPlan(plan) ||
    isMonthlyPlan(plan) ||
    isThreeMonthPlan(plan) ||
    isYearlyPlan(plan)
  ) {
    return "Get Premium";
  }

  return plan.buttonTitle || "Get Started";
}

export function getAccessTierKey(plan: SerializedPlan): AccessTierKey | null {
  if (isPremiumPlusPlan(plan)) {
    return "premiumPlus";
  }

  if (
    isWeeklyPlan(plan) ||
    isMonthlyPlan(plan) ||
    isThreeMonthPlan(plan) ||
    isYearlyPlan(plan)
  ) {
    return "premium";
  }

  return null;
}

export function getPlanDescription(plan: SerializedPlan) {
  if (isPremiumPlusPlan(plan) && isThreeMonthPlan(plan)) {
    return "Best overall value with mock exams, realistic practice, and enough time to improve.";
  }

  if (isPremiumPlusPlan(plan) && isYearlyPlan(plan)) {
    return "Long-term full access for students who want the deepest practice library and mock exams.";
  }

  if (isPremiumPlusPlan(plan)) {
    return "Everything in Premium, plus mock exams for full-test practice.";
  }

  if (isThreeMonthPlan(plan)) {
    return "Ideal for steady preparation with guided practice, AI feedback, and extra time to build confidence.";
  }

  if (isMonthlyPlan(plan)) {
    return "A balanced option for regular practice, score improvement, and full exam familiarity.";
  }

  if (isWeeklyPlan(plan)) {
    return "A short intensive sprint for last-minute revision before your exam.";
  }

  return "Start practicing with realistic CELPIP material and clear study guidance.";
}

export function getFooterNote(plan: SerializedPlan) {
  if (isPremiumPlusPlan(plan) && isThreeMonthPlan(plan)) {
    return "Includes mock exams plus the strongest overall savings.";
  }

  if (isPremiumPlusPlan(plan) && isYearlyPlan(plan)) {
    return "Best for long-term access, repeated mock exams, and continuous improvement.";
  }

  if (isPremiumPlusPlan(plan)) {
    return "Includes mock exams, full exam experience, and everything in Premium.";
  }

  if (
    isWeeklyPlan(plan) ||
    isMonthlyPlan(plan) ||
    isThreeMonthPlan(plan) ||
    isYearlyPlan(plan)
  ) {
    return "Includes full exam experience, AI feedback, and focused study support.";
  }

  return undefined;
}

export function formatBillingCycle(
  interval?: PlanBillingInterval,
  count?: number
) {
  if (!interval) return "";

  const safeCount = count && count > 0 ? count : 1;
  if (safeCount === 1) {
    return interval === "day" ? "day" : interval;
  }

  return `${safeCount} ${interval}s`;
}

export function buildMonthlySavingsMap(plans: SerializedPlan[]) {
  const savingsById = new Map<string, string>();
  const weeklyPlan = plans.find(isWeeklyPlan);
  const weeklyPrice = parsePrice(weeklyPlan?.price || "");

  if (weeklyPrice <= 0) {
    return savingsById;
  }

  plans.forEach((plan, index) => {
    if (!isMonthlyPlan(plan)) {
      return;
    }

    const monthlyPrice = parsePrice(plan.price);
    const fourWeeksPrice = weeklyPrice * 4;

    if (monthlyPrice <= 0 || fourWeeksPrice <= monthlyPrice) {
      return;
    }

    const monthlyOff = Math.round(((fourWeeksPrice - monthlyPrice) / fourWeeksPrice) * 100);
    if (monthlyOff > 0) {
      savingsById.set(getStablePlanId(plan, index), `Save ${monthlyOff}%`);
    }
  });

  return savingsById;
}
