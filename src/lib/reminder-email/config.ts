import { z } from "zod";

export const REMINDER_EMAIL_CONFIG_COLLECTION = "reminderEmailConfigs";
export const REMINDER_EMAIL_CONFIG_KEY = "default";

export const TRIGGER_TYPES = ["signup_no_activity", "inactive"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TIME_UNITS = ["minutes", "hours", "days"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export type ReminderEmailStage = {
  id: string;
  label: string;
  triggerType: TriggerType;
  delayAmount: number;
  delayUnit: TimeUnit;
  subject: string;
  htmlBody: string;
  enabled: boolean;
  sortOrder: number;
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
  subject: z.string().trim().min(1).max(500),
  htmlBody: z.string().max(200_000),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
});

export const ReminderEmailConfigWriteSchema = z.object({
  stages: z.array(ReminderEmailStageSchema).min(0).max(50),
});

const htmlWrap = (inner: string) =>
  `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#111;">${inner}</body></html>`;

export const REMINDER_EMAIL_DEFAULT_STAGES: ReminderEmailStage[] = [
  {
    id: "signup_20min",
    label: "Signup - 20min Welcome",
    triggerType: "signup_no_activity",
    delayAmount: 20,
    delayUnit: "minutes",
    subject: "Welcome to CELPIP Practice Test",
    htmlBody: htmlWrap(
      "<p>Hi {{first_name}},</p><p>Thanks for signing up. Jump into a free practice task when you have a minute — small steps add up before test day.</p>"
    ),
    enabled: true,
    sortOrder: 0,
  },
  {
    id: "signup_day1",
    label: "Signup - Day 1",
    triggerType: "signup_no_activity",
    delayAmount: 1,
    delayUnit: "days",
    subject: "Your CELPIP prep checklist",
    htmlBody: htmlWrap(
      "<p>Hi {{first_name}},</p><p>Here is a quick nudge: even 15 minutes of speaking or writing practice today can sharpen your score.</p>"
    ),
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "signup_day3",
    label: "Signup - Day 3",
    triggerType: "signup_no_activity",
    delayAmount: 3,
    delayUnit: "days",
    subject: "Still preparing for CELPIP?",
    htmlBody: htmlWrap(
      "<p>Hi {{first_name}},</p><p>Mock exams and timed practice mirror the real test — worth a look when you are ready to level up.</p>"
    ),
    enabled: true,
    sortOrder: 2,
  },
  {
    id: "signup_day7",
    label: "Signup - Day 7 Final",
    triggerType: "signup_no_activity",
    delayAmount: 7,
    delayUnit: "days",
    subject: "Before you go quiet on CELPIP prep",
    htmlBody: htmlWrap(
      "<p>Hi {{first_name}},</p><p>If you have questions about plans or practice, just reply to this email — we read every message.</p>"
    ),
    enabled: true,
    sortOrder: 3,
  },
  {
    id: "inactive_day1",
    label: "Inactive - Day 1",
    triggerType: "inactive",
    delayAmount: 1,
    delayUnit: "days",
    subject: "We miss you on CELPIP Practice Test",
    htmlBody: htmlWrap(
      "<p>Hi {{first_name}},</p><p>It has been a little while since your last visit. Pick one skill and do a short session — you will feel back on track fast.</p>"
    ),
    enabled: true,
    sortOrder: 4,
  },
  {
    id: "inactive_day7",
    label: "Inactive - Day 7",
    triggerType: "inactive",
    delayAmount: 7,
    delayUnit: "days",
    subject: "Come back when you are ready",
    htmlBody: htmlWrap(
      "<p>Hi {{first_name}},</p><p>Whenever you open the app again, your progress is waiting. Good luck with your CELPIP journey.</p>"
    ),
    enabled: true,
    sortOrder: 5,
  },
];

export const REMINDER_EMAIL_DEFAULT_CONFIG: ReminderEmailConfigInput = {
  stages: REMINDER_EMAIL_DEFAULT_STAGES,
};

type LegacyStage = Partial<ReminderEmailStage> & { senderCode?: string };

function coerceStage(raw: unknown, index: number): ReminderEmailStage {
  const r = raw as LegacyStage;
  const fallback =
    REMINDER_EMAIL_DEFAULT_STAGES.find((d) => d.id === r.id) ||
    REMINDER_EMAIL_DEFAULT_STAGES[index] ||
    REMINDER_EMAIL_DEFAULT_STAGES[0];

  const subject =
    typeof r.subject === "string" && r.subject.trim().length > 0
      ? r.subject.trim()
      : fallback.subject;
  const htmlBody =
    typeof r.htmlBody === "string" && r.htmlBody.trim().length > 0
      ? r.htmlBody
      : fallback.htmlBody;

  return {
    id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : fallback.id,
    label: typeof r.label === "string" && r.label.trim() ? r.label.trim() : fallback.label,
    triggerType: TRIGGER_TYPES.includes(r.triggerType as TriggerType)
      ? (r.triggerType as TriggerType)
      : fallback.triggerType,
    delayAmount:
      typeof r.delayAmount === "number" && r.delayAmount >= 1 ? r.delayAmount : fallback.delayAmount,
    delayUnit: TIME_UNITS.includes(r.delayUnit as TimeUnit)
      ? (r.delayUnit as TimeUnit)
      : fallback.delayUnit,
    subject,
    htmlBody,
    enabled: typeof r.enabled === "boolean" ? r.enabled : fallback.enabled,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : index,
  };
}

export function buildReminderEmailConfigWithDefaults(
  raw?: Partial<ReminderEmailConfigInput> | null
): ReminderEmailConfigInput {
  if (!raw || !Array.isArray(raw.stages) || raw.stages.length === 0) {
    return REMINDER_EMAIL_DEFAULT_CONFIG;
  }

  const coerced = raw.stages.map((s, i) => coerceStage(s, i));
  const sortedStages = [...coerced].sort((a, b) => a.sortOrder - b.sortOrder);
  sortedStages.forEach((stage, idx) => {
    stage.sortOrder = idx;
  });

  return { stages: sortedStages };
}
