import type { PlanIconType, SerializedPlan } from "@/types/pricing";

type ClassicPresentation = {
  title: string;
  type: string;
  oldPrice: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  iconWrapperColor: string;
  iconType: PlanIconType;
};

/** Classic modal copy keyed by `pricing-plans.json` / template id. Live price comes from Stripe. */
const CLASSIC_PLAN_PRESENTATION: Record<string, ClassicPresentation> = {
  "weekly-plus": {
    title: "Weekly",
    type: "Weekly",
    oldPrice: "25.00",
    discount: "30",
    buttonTitle: "Go Premium",
    features: [
      "Unlimited access to 3,000+ practices",
      "60 full mock exams",
      "Instant AI feedback for all skills",
      "Progress tracking and insights",
    ],
    iconWrapperColor: "bg-[#D1DEFF]",
    iconType: "FreePlan",
  },
  "monthly-plus": {
    title: "Premium Monthly",
    type: "Easy Start",
    oldPrice: "80.00",
    discount: "40",
    buttonTitle: "Go Premium",
    features: [
      "Unlimited access to 3,000+ practices",
      "60 full mock exams",
      "Instant AI feedback for all skills",
      "Progress tracking and insights",
    ],
    iconWrapperColor: "bg-purple5",
    iconType: "PopularPlan",
  },
  "three-month-plus": {
    title: "Premium 3-Month",
    type: "Best Seller",
    oldPrice: "240.99",
    discount: "70",
    buttonTitle: "Save Now",
    features: [
      "Full access to all premium features",
      "Valid for 3 months",
      "Ideal for test-takers with a set deadline",
      "Includes all mock exams and practice",
    ],
    iconWrapperColor: "bg-secondary5",
    iconType: "BestValuePlan",
  },
  "yearly-plus": {
    title: "Premium Yearly",
    type: "Best Value",
    oldPrice: "599.99",
    discount: "65",
    buttonTitle: "Save Now",
    features: [
      "Full access to all premium features",
      "Valid for 12 months",
      "Best for long-term preparation",
      "Includes all mock exams and practice",
    ],
    iconWrapperColor: "bg-secondary5",
    iconType: "BestValuePlan",
  },
};

export type ClassicPlanCardModel = SerializedPlan & {
  title: string;
  type: string;
  oldPrice: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  iconWrapperColor: string;
};

/** Classic pricing modal card order (matches legacy Mongo `plans` seed). */
export const CLASSIC_MODAL_PLAN_ORDER = [
  "three-month-plus",
  "monthly-plus",
  "weekly-plus",
  "yearly-plus",
] as const;

export function sortPlansForClassicModal<T extends { _id?: string; order?: number }>(
  plans: T[],
): T[] {
  return [...plans].sort((left, right) => {
    const leftKey = left._id?.trim() ?? "";
    const rightKey = right._id?.trim() ?? "";
    const leftIndex = CLASSIC_MODAL_PLAN_ORDER.indexOf(
      leftKey as (typeof CLASSIC_MODAL_PLAN_ORDER)[number],
    );
    const rightIndex = CLASSIC_MODAL_PLAN_ORDER.indexOf(
      rightKey as (typeof CLASSIC_MODAL_PLAN_ORDER)[number],
    );
    const leftOrder = leftIndex === -1 ? (left.order ?? Number.MAX_SAFE_INTEGER) : leftIndex;
    const rightOrder = rightIndex === -1 ? (right.order ?? Number.MAX_SAFE_INTEGER) : rightIndex;
    return leftOrder - rightOrder;
  });
}

export function getClassicPlanIconType(
  planId: string | undefined,
  fallback?: PlanIconType,
): PlanIconType {
  const preset = planId ? CLASSIC_PLAN_PRESENTATION[planId] : undefined;
  return preset?.iconType ?? fallback ?? "FreePlan";
}

export function toClassicPlanPresentation(plan: SerializedPlan): ClassicPlanCardModel {
  const key = plan._id?.trim() ?? "";
  const preset = CLASSIC_PLAN_PRESENTATION[key];

  if (!preset) {
    return {
      ...plan,
      iconWrapperColor: plan.iconWrapperColor ?? "bg-purple5",
    };
  }

  return {
    ...plan,
    ...preset,
  };
}
