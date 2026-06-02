import { applyMergeTags } from "@/lib/email/resend-client";

export const REMINDER_MERGE_TAG_KEYS = ["first_name", "practice_url", "listening_url"] as const;

export type ReminderMergeTagKey = (typeof REMINDER_MERGE_TAG_KEYS)[number];

export const REMINDER_MERGE_TAG_HELP: Record<
  ReminderMergeTagKey,
  { label: string; example: string }
> = {
  first_name: { label: "First name", example: "Alex" },
  practice_url: { label: "Practice hub", example: "https://celpippracticetest.com/practice-overview" },
  listening_url: { label: "Listening practice", example: "https://celpippracticetest.com/listening" },
};

export function resolveReminderSiteOrigin(): string {
  const base =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://celpippracticetest.com";
  return base.replace(/\/+$/, "");
}

export function buildReminderMergeFields(input: {
  firstName?: string;
  email?: string;
  siteOrigin?: string;
}): Record<string, string> {
  const origin = (input.siteOrigin || resolveReminderSiteOrigin()).replace(/\/+$/, "");
  const localPart = input.email?.split("@")[0]?.trim() || "";
  const first = input.firstName?.trim() || localPart || "there";

  return {
    first_name: first,
    practice_url: `${origin}/practice-overview`,
    listening_url: `${origin}/listening`,
  };
}

export function renderReminderEmail(
  subject: string,
  htmlBody: string,
  fields: Record<string, string>
): { subject: string; html: string } {
  return {
    subject: applyMergeTags(subject, fields),
    html: applyMergeTags(htmlBody, fields),
  };
}

/** Sample merge values for admin test sends and previews. */
export function sampleReminderMergeFields(): Record<string, string> {
  return buildReminderMergeFields({
    firstName: "Alex",
    email: "alex@example.com",
  });
}
