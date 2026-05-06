import { z } from "zod";

export const NURTURE_EMAIL_CONFIG_COLLECTION = "nurtureEmailConfigs";
export const NURTURE_EMAIL_CONFIG_KEY = "default";

export const TRIGGER_TYPES = ["signup", "free_user_active", "premium_user"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TIME_UNITS = ["minutes", "hours", "days", "weeks"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export type NurtureEmailStage = {
  id: string; // Unique identifier for the stage
  label: string; // Display name (e.g., "Welcome Email - Day 1")
  triggerType: TriggerType; // What triggers this sequence
  delayAmount: number; // How long to wait from trigger
  delayUnit: TimeUnit; // Unit of time
  subject: string; // Email Subject line
  bodyHtml: string; // HTML content of the email
  enabled: boolean; // Whether this stage is active
  sortOrder: number; // Order in which stages are displayed/processed
};

export type NurtureEmailConfigInput = {
  stages: NurtureEmailStage[];
};

export const NurtureEmailStageSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  triggerType: z.enum(TRIGGER_TYPES),
  delayAmount: z.number().int().min(1).max(10000),
  delayUnit: z.enum(TIME_UNITS),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().trim().min(1),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const NurtureEmailConfigWriteSchema = z.object({
  stages: z.array(NurtureEmailStageSchema).min(0).max(50),
});

export const NURTURE_EMAIL_DEFAULT_STAGES: NurtureEmailStage[] = [
  {
    id: "nurture_day1",
    label: "Nurture - Day 1",
    triggerType: "signup",
    delayAmount: 1,
    delayUnit: "days",
    subject: "Welcome to CELPIP Practice!",
    bodyHtml: "<p>Hi there,</p><p>Welcome to our platform!</p>",
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "nurture_day3",
    label: "Nurture - Day 3",
    triggerType: "signup",
    delayAmount: 3,
    delayUnit: "days",
    subject: "Checking in - Day 3",
    bodyHtml: "<p>Hi again,</p><p>How are your studies going?</p>",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "nurture_day7",
    label: "Nurture - Day 7",
    triggerType: "signup",
    delayAmount: 7,
    delayUnit: "days",
    subject: "One week in!",
    bodyHtml: "<p>You have been with us for a week now!</p>",
    enabled: true,
    sortOrder: 2,
  },
];

export const NURTURE_EMAIL_DEFAULT_CONFIG: NurtureEmailConfigInput = {
  stages: NURTURE_EMAIL_DEFAULT_STAGES,
};

export function buildNurtureEmailConfigWithDefaults(
  raw?: Partial<NurtureEmailConfigInput> | null
): NurtureEmailConfigInput {
  if (!raw || !Array.isArray(raw.stages) || raw.stages.length === 0) {
    return NURTURE_EMAIL_DEFAULT_CONFIG;
  }

  // Sort stages by sortOrder
  const sortedStages = [...raw.stages].sort((a, b) => a.sortOrder - b.sortOrder);

  return { stages: sortedStages };
}
