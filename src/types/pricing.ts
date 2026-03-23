export type PlanBillingInterval = "day" | "week" | "month" | "year";

export type PlanIconType = "BestValuePlan" | "PopularPlan" | "FreePlan";

export type DurationGroupKey = "weekly" | "monthly" | "threeMonth" | "yearly";

export type AccessTierKey = "premium" | "premiumPlus";

export type SerializedPlan = {
  _id?: string;
  title: string;
  type: string;
  planTitle: string;
  oldPrice: string;
  price: string;
  discount: string;
  buttonTitle: string;
  features: string[];
  billingInterval?: PlanBillingInterval;
  billingIntervalCount?: number;
  stripePriceId?: string;
  iconType?: PlanIconType;
  iconWrapperColor?: string;
  order?: number;
};

export type PricingFaq = {
  question: string;
  answer: string;
};

export type PricingTestimonial = {
  name: string;
  comment: string;
  source: string;
};
