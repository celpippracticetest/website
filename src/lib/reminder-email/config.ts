import { z } from "zod";

export const REMINDER_EMAIL_CONFIG_COLLECTION = "reminderEmailConfigs";
export const REMINDER_EMAIL_CONFIG_KEY = "default";

export const TRIGGER_TYPES = ["signup_no_activity", "inactive"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TIME_UNITS = ["minutes", "hours", "days"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export type ReminderEmailStage = {
  id: string; // Unique identifier for the stage
  label: string; // Display name (e.g., "Welcome Email - 20min")
  triggerType: TriggerType; // What triggers this email
  delayAmount: number; // How long to wait (e.g., 20)
  delayUnit: TimeUnit; // Unit of time (minutes, hours, days)
  senderCode: string; // Sender.net transactional email code
  enabled: boolean; // Whether this stage is active
  sortOrder: number; // Order in which stages are processed
};

export type ReminderEmailConfigInput = {
  stages: ReminderEmailStage[];
};

export const ReminderEmailStageSchema = z.object({
  id: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  triggerType: z.enum(TRIGGER_TYPES),
  delayAmount: z.number().int().min(1).max(10000),
  delayUnit: z.enum(TIME_UNITS),
  senderCode: z.string().trim().min(1).max(50),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const ReminderEmailConfigWriteSchema = z.object({
  stages: z.array(ReminderEmailStageSchema).min(0).max(50),
});

export const REMINDER_EMAIL_DEFAULT_STAGES: ReminderEmailStage[] = [
  {
    id: "signup_20min",
    label: "Signup - 20min Welcome",
    triggerType: "signup_no_activity",
    delayAmount: 20,
    delayUnit: "minutes",
    senderCode: "CHANGEME",
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "signup_day1",
    label: "Signup - Day 1",
    triggerType: "signup_no_activity",
    delayAmount: 1,
    delayUnit: "days",
    senderCode: "CHANGEME",
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "signup_day3",
    label: "Signup - Day 3",
    triggerType: "signup_no_activity",
    delayAmount: 3,
    delayUnit: "days",
    senderCode: "CHANGEME",
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "signup_day7",
    label: "Signup - Day 7 Final",
    triggerType: "signup_no_activity",
    delayAmount: 7,
    delayUnit: "days",
    senderCode: "CHANGEME",
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "inactive_day1",
    label: "Inactive - Day 1",
    triggerType: "inactive",
    delayAmount: 1,
    delayUnit: "days",
    senderCode: "CHANGEME",
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "inactive_day7",
    label: "Inactive - Day 7",
    triggerType: "inactive",
    delayAmount: 7,
    delayUnit: "days",
    senderCode: "CHANGEME",
    enabled: true,
    sortOrder: 5,
  },
];

export const REMINDER_EMAIL_DEFAULT_CONFIG: ReminderEmailConfigInput = {
  stages: REMINDER_EMAIL_DEFAULT_STAGES,
};

export function buildReminderEmailConfigWithDefaults(
  raw?: Partial<ReminderEmailConfigInput> | null
): ReminderEmailConfigInput {
  if (!raw || !Array.isArray(raw.stages) || raw.stages.length === 0) {
    return REMINDER_EMAIL_DEFAULT_CONFIG;
  }

  // Sort stages by sortOrder
  const sortedStages = [...raw.stages].sort((a, b) => a.sortOrder - b.sortOrder);

  return { stages: sortedStages };
}

