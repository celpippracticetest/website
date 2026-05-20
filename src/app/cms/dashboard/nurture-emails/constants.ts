import {
  NURTURE_MERGE_TAG_HELP,
  NURTURE_MERGE_TAG_KEYS,
} from "@/lib/nurture-email/merge-fields";
import type { NurtureTriggerType } from "@/lib/nurture-email/config";

export const TRIGGER_LABELS: Record<NurtureTriggerType, string> = {
  signup: "New signup (free)",
  free_user_active: "Active free user (upsell)",
  inactive_free: "Inactive free user (win-back)",
};

export const TRIGGER_DESCRIPTIONS: Record<NurtureTriggerType, string> = {
  signup:
    "Runs from account creation. Educate, build habit, introduce Plus — for users who have not subscribed.",
  free_user_active:
    "Runs from first practice while still on free plan. Focus on mocks, feedback, and upgrade timing.",
  inactive_free:
    "Runs after 72+ hours without activity (but they practiced before). Win-back + soft conversion.",
};

export const MERGE_TAG_ROWS = NURTURE_MERGE_TAG_KEYS.map((key) => ({
  key,
  token: `{{${key}}}`,
  ...NURTURE_MERGE_TAG_HELP[key],
}));
