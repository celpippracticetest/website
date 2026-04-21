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

/** Map Stripe recurring fields to our duration bucket (same rules as billing on SerializedPlan). */
export function getDurationGroupKeyFromStripeRecurring(
  interval: "day" | "week" | "month" | "year" | undefined,
  intervalCount: number | undefined
): DurationGroupKey | null {
  if (!interval || interval === "day") {
    return null;
  }
  const count = intervalCount ?? 1;
  if (interval === "week" && count === 1) {
    return "weekly";
  }
  if (interval === "month" && count === 1) {
    return "monthly";
  }
  if (interval === "month" && count === 3) {
    return "threeMonth";
  }
  if (interval === "year" && count === 1) {
    return "yearly";
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
    planText.includes("pro") ||
    /\bplus\b/.test(planText)
  );
}

/** Bullets on /pricing compact PlanCard for Premium (and shared tail for Premium Plus). */
export const PRICING_COMPACT_CARD_CORE_FEATURES = [
  "3,000+ practice questions",
  "AI scoring + feedback",
  "Progress tracking",
  "Smart Flashcards",
  "CLB Vocabulary Trainer",
  "AI Vocabulary Booster",
] as const;

/** Leading bullets on Premium Plus compact cards (rendered bold in PlanCard). */
export const PRICING_COMPACT_CARD_PLUS_LEAD_FEATURES = [
  "60 full mock exams",
  "Real exam simulation",
] as const;

export function getPricingCompactPlanCardFeatures(plan: SerializedPlan): {
  features: string[];
  leadingBoldFeatureCount: number;
} {
  if (isPremiumPlusPlan(plan)) {
    return {
      features: [
        ...PRICING_COMPACT_CARD_PLUS_LEAD_FEATURES,
        ...PRICING_COMPACT_CARD_CORE_FEATURES,
      ],
      leadingBoldFeatureCount: PRICING_COMPACT_CARD_PLUS_LEAD_FEATURES.length,
    };
  }
  return {
    features: [...PRICING_COMPACT_CARD_CORE_FEATURES],
    leadingBoldFeatureCount: 0,
  };
}

export type PricingTierComparisonRow = {
  label: string;
  premium: boolean;
  premiumPlus: boolean;
  /** Stronger label style for tier-differentiating rows */
  labelEmphasis?: boolean;
};

/** Rows for Premium vs Premium Plus matrix (legacy two-column layouts / CMS). */
export const PRICING_TIER_COMPARISON_ROWS: PricingTierComparisonRow[] = [
  {
    label: "60 full mock exams",
    premium: false,
    premiumPlus: true,
    labelEmphasis: true,
  },
  {
    label: "Real exam simulation",
    premium: false,
    premiumPlus: true,
    labelEmphasis: true,
  },
  ...PRICING_COMPACT_CARD_CORE_FEATURES.map((label) => ({
    label,
    premium: true,
    premiumPlus: true,
  })),
];

/** Plus tier: ordered labels for single-tier pricing UI (all included). */
export const PRICING_PLUS_FEATURE_LABELS: readonly string[] = PRICING_TIER_COMPARISON_ROWS.map(
  (row) => row.label
);

export function getDurationGroupKey(plan: SerializedPlan): DurationGroupKey | null {
  return getDurationGroupKeyFromName(plan) || getDurationGroupKeyFromBilling(plan);
}

export function getStablePlanId(plan: SerializedPlan, index: number) {
  return plan._id || `${index}`;
}

export function getAccessLabel(plan: SerializedPlan) {
  if (isPremiumPlusPlan(plan)) {
    return "Plus";
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
    return "Get Plus";
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
    return "Best overall value: mock exams, realistic practice, and enough time to improve.";
  }

  if (isPremiumPlusPlan(plan) && isYearlyPlan(plan)) {
    return "Long-term full access: the deepest practice library and unlimited mock exam prep.";
  }

  if (isPremiumPlusPlan(plan)) {
    return "Full access: mock exams, realistic exam simulation, and every practice feature.";
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
    return "Includes mock exams, full exam simulation, and the complete practice library.";
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

/**
 * Weeks of tier-matched weekly price used as the baseline for "Save X%" on 3-month plans.
 * Strict 12 weeks understates common marketing comparisons (e.g. CA$14.99×12 vs CA$59.99 ≈ 67%).
 * 16 weeks aligns ~75% for that example and reflects a longer "pay weekly" window vs one 3-mo charge.
 */
const THREE_MONTH_SAVINGS_BASELINE_WEEKS = 16;

/** Weekly list price for the same access tier (Premium vs Premium Plus), for savings vs weekly. */
function weeklyUnitPriceMatchingTier(plan: SerializedPlan, plans: SerializedPlan[]): number {
  const targetPlus = isPremiumPlusPlan(plan);
  const tierWeekly = plans.find(
    (p) => isWeeklyPlan(p) && isPremiumPlusPlan(p) === targetPlus
  );
  let unit = parsePrice(tierWeekly?.price || "");
  if (unit > 0) {
    return unit;
  }
  const anyWeekly = plans.find(isWeeklyPlan);
  return parsePrice(anyWeekly?.price || "");
}

export function buildMonthlySavingsMap(plans: SerializedPlan[]) {
  const savingsById = new Map<string, string>();

  plans.forEach((plan, index) => {
    const weeklyPrice = weeklyUnitPriceMatchingTier(plan, plans);
    if (weeklyPrice <= 0) {
      return;
    }

    const stableId = getStablePlanId(plan, index);
    const planPrice = parsePrice(plan.price);

    if (planPrice <= 0) {
      return;
    }

    if (isMonthlyPlan(plan)) {
      const fourWeeksPrice = weeklyPrice * 4;
      if (fourWeeksPrice <= planPrice) {
        return;
      }
      const off = Math.round(((fourWeeksPrice - planPrice) / fourWeeksPrice) * 100);
      if (off > 0) {
        savingsById.set(stableId, `Save ${off}%`);
      }
      return;
    }

    if (isThreeMonthPlan(plan)) {
      const baselineVsWeekly = weeklyPrice * THREE_MONTH_SAVINGS_BASELINE_WEEKS;
      if (baselineVsWeekly <= planPrice) {
        return;
      }
      const off = Math.round(((baselineVsWeekly - planPrice) / baselineVsWeekly) * 100);
      if (off > 0) {
        savingsById.set(stableId, `Save ${off}%`);
      }
      return;
    }

    if (isYearlyPlan(plan)) {
      const fiftyTwoWeeksPrice = weeklyPrice * 52;
      if (fiftyTwoWeeksPrice <= planPrice) {
        return;
      }
      const off = Math.round(((fiftyTwoWeeksPrice - planPrice) / fiftyTwoWeeksPrice) * 100);
      if (off > 0) {
        savingsById.set(stableId, `Save ${off}%`);
      }
    }
  });

  return savingsById;
}

/**
 * Calculates a "regular" price baseline from weekly pricing for each non-weekly plan,
 * matching access tier (Premium vs Premium Plus).
 */
export function buildOriginalPriceFromWeeklyMap(plans: SerializedPlan[]) {
  const originalPriceById = new Map<string, string>();

  plans.forEach((plan, index) => {
    if (isWeeklyPlan(plan)) {
      return;
    }

    const weeklyPrice = weeklyUnitPriceMatchingTier(plan, plans);
    if (weeklyPrice <= 0) {
      return;
    }

    const planPrice = parsePrice(plan.price);
    if (planPrice <= 0) {
      return;
    }

    let baselineWeeks = 0;
    if (isMonthlyPlan(plan)) {
      baselineWeeks = 4;
    } else if (isThreeMonthPlan(plan)) {
      baselineWeeks = THREE_MONTH_SAVINGS_BASELINE_WEEKS;
    } else if (isYearlyPlan(plan)) {
      baselineWeeks = 52;
    }

    if (baselineWeeks <= 0) {
      return;
    }

    const originalPrice = weeklyPrice * baselineWeeks;
    if (originalPrice <= planPrice) {
      return;
    }

    const stableId = getStablePlanId(plan, index);
    originalPriceById.set(stableId, String(originalPrice));
  });

  return originalPriceById;
}

/**
 * Creates short labels like "Includes 2 weeks free vs weekly" for monthly plans,
 * derived from the same weekly baseline used for savings/original-price math.
 */
export function buildFreeWeeksLabelFromWeeklyMap(plans: SerializedPlan[]) {
  const freeWeeksLabelById = new Map<string, string>();

  plans.forEach((plan, index) => {
    const isMonthly = isMonthlyPlan(plan);
    const isThreeMonth = isThreeMonthPlan(plan);
    if (!isMonthly && !isThreeMonth) {
      return;
    }

    const weeklyPrice = weeklyUnitPriceMatchingTier(plan, plans);
    if (weeklyPrice <= 0) {
      return;
    }

    const planPrice = parsePrice(plan.price);
    if (planPrice <= 0) {
      return;
    }

    const baselineWeeks = isThreeMonth ? THREE_MONTH_SAVINGS_BASELINE_WEEKS : 4;
    const includedWeeks = planPrice / weeklyPrice;
    const freeWeeksRaw = baselineWeeks - includedWeeks;
    if (freeWeeksRaw < 0.5) {
      return;
    }

    const roundedFreeWeeks = Math.round(freeWeeksRaw);
    const freeWeeks =
      Math.abs(freeWeeksRaw - roundedFreeWeeks) <= 0.2 ? roundedFreeWeeks : freeWeeksRaw;
    const freeWeeksText =
      Number.isInteger(freeWeeks) || Math.abs(freeWeeks - Math.round(freeWeeks)) < 0.001
        ? `${Math.round(freeWeeks)}`
        : freeWeeks.toFixed(1).replace(/\.0$/, "");

    const stableId = getStablePlanId(plan, index);
    freeWeeksLabelById.set(
      stableId,
      `Includes ${freeWeeksText} free week${freeWeeksText === "1" ? "" : "s"}`
    );
  });

  return freeWeeksLabelById;
}
