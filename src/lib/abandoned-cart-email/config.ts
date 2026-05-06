import { z } from "zod";

export const ABANDONED_CART_EMAIL_CONFIG_COLLECTION = "abandonedCartEmailConfigs";
export const ABANDONED_CART_EMAIL_CONFIG_KEY = "default";

export const ABANDONED_CART_TIME_UNITS = ["minutes", "hours", "days"] as const;
export type AbandonedCartTimeUnit = (typeof ABANDONED_CART_TIME_UNITS)[number];

export type AbandonedCartEmailStage = {
  id: string;
  label: string;
  delayAmount: number;
  delayUnit: AbandonedCartTimeUnit;
  subject: string;
  htmlBody: string;
  enabled: boolean;
  sortOrder: number;
};

export type AbandonedCartEmailConfigInput = {
  stages: AbandonedCartEmailStage[];
};

export const AbandonedCartEmailStageSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  delayAmount: z.number().int().min(1).max(10000),
  delayUnit: z.enum(ABANDONED_CART_TIME_UNITS),
  subject: z.string().trim().min(1).max(500),
  htmlBody: z.string().max(200_000),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const AbandonedCartEmailConfigWriteSchema = z.object({
  stages: z.array(AbandonedCartEmailStageSchema).min(0).max(20),
});

const defaultHtml = (body: string) =>
  `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;">${body}</body></html>`;

export const ABANDONED_CART_EMAIL_DEFAULT_STAGES: AbandonedCartEmailStage[] = [
  {
    id: "cart_nudge",
    label: "Abandoned cart — gentle nudge",
    delayAmount: 2,
    delayUnit: "hours",
    subject: "Did something go wrong with your CELPIP prep?",
    htmlBody: defaultHtml(
      "<p>Hi {{first_name}},</p><p>You left checkout before finishing. If you hit a problem, reply to this email and we will help.</p><p><a href=\"{{checkout_url}}\">Return to checkout</a></p>"
    ),
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "cart_social_proof",
    label: "Abandoned cart — social proof",
    delayAmount: 24,
    delayUnit: "hours",
    subject: "Practice now so you only take the CELPIP once",
    htmlBody: defaultHtml(
      "<p>Hi {{first_name}},</p><p>Thousands of learners use our mock exams to build confidence before test day.</p><p><a href=\"{{checkout_url}}\">Complete your order for {{product_name}}</a></p>"
    ),
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "cart_closer",
    label: "Abandoned cart — final reminder",
    delayAmount: 48,
    delayUnit: "hours",
    subject: "Still interested in CELPIP practice?",
    htmlBody: defaultHtml(
      "<p>Hi {{first_name}},</p><p>This is a final reminder — your checkout link is still available.</p><p><a href=\"{{checkout_url}}\">Finish checkout</a></p>"
    ),
    enabled: true,
    sortOrder: 2,
  },
];

export const ABANDONED_CART_EMAIL_DEFAULT_CONFIG: AbandonedCartEmailConfigInput = {
  stages: ABANDONED_CART_EMAIL_DEFAULT_STAGES,
};

export function buildAbandonedCartEmailConfigWithDefaults(
  raw?: Partial<AbandonedCartEmailConfigInput> | null
): AbandonedCartEmailConfigInput {
  if (!raw || !Array.isArray(raw.stages) || raw.stages.length === 0) {
    return ABANDONED_CART_EMAIL_DEFAULT_CONFIG;
  }
  const sortedStages = [...raw.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  return { stages: sortedStages };
}
