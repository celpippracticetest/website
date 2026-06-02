import {
  REMINDER_MERGE_TAG_HELP,
  REMINDER_MERGE_TAG_KEYS,
} from "@/lib/reminder-email/merge-fields";
import type { TriggerType } from "@/lib/reminder-email/config";

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  signup_no_activity: "After signup (no activity)",
  inactive: "After user becomes inactive",
};

export const TRIGGER_DESCRIPTIONS: Record<TriggerType, string> = {
  signup_no_activity:
    "Runs from account creation when the user has not started practicing yet. Welcome and habit-building nudges.",
  inactive:
    "Runs from the user's last activity when they were active before but have gone quiet. Win-back nudges.",
};

export const MERGE_TAG_ROWS = REMINDER_MERGE_TAG_KEYS.map((key) => ({
  key,
  token: `{{${key}}}`,
  ...REMINDER_MERGE_TAG_HELP[key],
}));
