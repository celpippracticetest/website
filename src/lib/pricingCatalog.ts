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
    title: "Plus",
    summary: "Mock exams, full exam simulation, AI feedback, and the full practice library.",
  },
  premiumPlus: {
    title: "Plus",
    summary: "Mock exams, full exam simulation, AI feedback, and the full practice library.",
  },
};

export const planTemplates: PlanTemplate[] = [
  {
    id: "weekly-plus",
    label: "Weekly / Plus",
    durationKey: "weekly",
    accessTier: "premiumPlus",
    title: "Plus Weekly",
    type: "Weekly",
    planTitle: "Weekly",
    buttonTitle: "Start Weekly Plan",
    billingInterval: "week",
    billingIntervalCount: 1,
    iconType: "PopularPlan",
    iconWrapperColor: "bg-purple5",
  },
  {
    id: "monthly-plus",
    label: "Monthly / Plus",
    durationKey: "monthly",
    accessTier: "premiumPlus",
    title: "Plus Monthly",
    type: "Monthly",
    planTitle: "Monthly",
    buttonTitle: "Start Monthly Plan",
    billingInterval: "month",
    billingIntervalCount: 1,
    iconType: "BestValuePlan",
    iconWrapperColor: "bg-secondary5",
  },
  {
    id: "three-month-plus",
    label: "3-Month / Plus",
    durationKey: "threeMonth",
    accessTier: "premiumPlus",
    title: "Plus 3-Month",
    type: "Best Seller",
    planTitle: "3 Months",
    buttonTitle: "Choose 3-Month Plan",
    billingInterval: "month",
    billingIntervalCount: 3,
    iconType: "BestValuePlan",
    iconWrapperColor: "bg-secondary5",
  },
  {
    id: "yearly-plus",
    label: "Yearly / Plus",
    durationKey: "yearly",
    accessTier: "premiumPlus",
    title: "Plus Yearly",
    type: "Best Value",
    planTitle: "Yearly",
    buttonTitle: "Choose Yearly Plan",
    billingInterval: "year",
    billingIntervalCount: 1,
    iconType: "BestValuePlan",
    iconWrapperColor: "bg-secondary5",
  },
];

const LEGACY_TEMPLATE_IDS: Record<string, string> = {
  "weekly-premium-plus": "weekly-plus",
  "monthly-premium-plus": "monthly-plus",
  "three-month-premium-plus": "three-month-plus",
  "yearly-premium-plus": "yearly-plus",
  "weekly-premium": "weekly-plus",
  "monthly-premium": "monthly-plus",
  "three-month-premium": "three-month-plus",
  "yearly-premium": "yearly-plus",
};

export function getPlanTemplateById(templateId: string) {
  const resolvedId = LEGACY_TEMPLATE_IDS[templateId] ?? templateId;
  return planTemplates.find((template) => template.id === resolvedId) || null;
}
