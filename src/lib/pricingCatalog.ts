import type { AccessTierKey, DurationGroupKey, PlanIconType } from "@/types/pricing";

type DurationMeta = {
  eyebrow: string;
  title: string;
  summary: string;
  badge?: string;
};

type AccessTierMeta = {
  title: string;
  summary: string;
};

export type PlanTemplate = {
  id: string;
  label: string;
  durationKey: DurationGroupKey;
  accessTier: AccessTierKey;
  title: string;
  type: string;
  planTitle: string;
  buttonTitle: string;
  billingInterval: "week" | "month" | "year";
  billingIntervalCount: number;
  iconType: PlanIconType;
  iconWrapperColor: string;
};

export const durationDisplayOrder: DurationGroupKey[] = [
  "weekly",
  "monthly",
  "threeMonth",
  "yearly",
];

export const durationMeta: Record<DurationGroupKey, DurationMeta> = {
  weekly: {
    eyebrow: "Short Sprint",
    title: "Weekly",
    summary: "Best for urgent prep and last-minute revision.",
  },
  monthly: {
    eyebrow: "Most Flexible",
    title: "Monthly",
    summary: "Best for steady progress and balanced practice.",
  },
  threeMonth: {
    eyebrow: "Best Value",
    title: "3-Month",
    summary: "Best for full prep, stronger improvement, and better savings.",
  },
  yearly: {
    eyebrow: "Long-Term Access",
    title: "Yearly",
    summary: "Best for students who want extended access and repeat practice.",
  },
};

export const accessTierMeta: Record<AccessTierKey, AccessTierMeta> = {
  premium: {
    title: "Premium",
    summary: "Daily practice with AI feedback, full exam experience, and study support.",
  },
  premiumPlus: {
    title: "Plus",
    summary: "Mock exams, full exam simulation, AI feedback, and the full practice library.",
  },
};

export const planTemplates: PlanTemplate[] = [
  {
    id: "weekly-premium",
    label: "Weekly / Premium",
    durationKey: "weekly",
    accessTier: "premium",
    title: "Premium Weekly",
    type: "Weekly",
    planTitle: "Weekly",
    buttonTitle: "Start Weekly Plan",
    billingInterval: "week",
    billingIntervalCount: 1,
    iconType: "PopularPlan",
    iconWrapperColor: "bg-purple5",
  },
  {
    id: "weekly-premium-plus",
    label: "Weekly / Premium Plus",
    durationKey: "weekly",
    accessTier: "premiumPlus",
    title: "Premium Plus Weekly",
    type: "Weekly",
    planTitle: "Weekly",
    buttonTitle: "Start Weekly Plan",
    billingInterval: "week",
    billingIntervalCount: 1,
    iconType: "PopularPlan",
    iconWrapperColor: "bg-purple5",
  },
  {
    id: "monthly-premium",
    label: "Monthly / Premium",
    durationKey: "monthly",
    accessTier: "premium",
    title: "Premium Monthly",
    type: "Easy Start",
    planTitle: "Monthly",
    buttonTitle: "Start Monthly Plan",
    billingInterval: "month",
    billingIntervalCount: 1,
    iconType: "PopularPlan",
    iconWrapperColor: "bg-purple5",
  },
  {
    id: "monthly-premium-plus",
    label: "Monthly / Premium Plus",
    durationKey: "monthly",
    accessTier: "premiumPlus",
    title: "Premium Plus Monthly",
    type: "Monthly",
    planTitle: "Monthly",
    buttonTitle: "Start Monthly Plan",
    billingInterval: "month",
    billingIntervalCount: 1,
    iconType: "BestValuePlan",
    iconWrapperColor: "bg-secondary5",
  },
  {
    id: "three-month-premium",
    label: "3-Month / Premium",
    durationKey: "threeMonth",
    accessTier: "premium",
    title: "Premium 3-Month",
    type: "3-Month",
    planTitle: "3 Months",
    buttonTitle: "Choose 3-Month Plan",
    billingInterval: "month",
    billingIntervalCount: 3,
    iconType: "PopularPlan",
    iconWrapperColor: "bg-purple5",
  },
  {
    id: "three-month-premium-plus",
    label: "3-Month / Premium Plus",
    durationKey: "threeMonth",
    accessTier: "premiumPlus",
    title: "Premium Plus 3-Month",
    type: "Best Seller",
    planTitle: "3 Months",
    buttonTitle: "Choose 3-Month Plan",
    billingInterval: "month",
    billingIntervalCount: 3,
    iconType: "BestValuePlan",
    iconWrapperColor: "bg-secondary5",
  },
  {
    id: "yearly-premium",
    label: "Yearly / Premium",
    durationKey: "yearly",
    accessTier: "premium",
    title: "Premium Yearly",
    type: "Yearly",
    planTitle: "Yearly",
    buttonTitle: "Choose Yearly Plan",
    billingInterval: "year",
    billingIntervalCount: 1,
    iconType: "PopularPlan",
    iconWrapperColor: "bg-purple5",
  },
  {
    id: "yearly-premium-plus",
    label: "Yearly / Premium Plus",
    durationKey: "yearly",
    accessTier: "premiumPlus",
    title: "Premium Plus Yearly",
    type: "Best Value",
    planTitle: "Yearly",
    buttonTitle: "Choose Yearly Plan",
    billingInterval: "year",
    billingIntervalCount: 1,
    iconType: "BestValuePlan",
    iconWrapperColor: "bg-secondary5",
  },
];

export function getPlanTemplateById(templateId: string) {
  return planTemplates.find((template) => template.id === templateId) || null;
}
