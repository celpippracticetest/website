import { applyMergeTags } from "@/lib/email/resend-client";

export const REMINDER_MERGE_TAG_KEYS = [
  "first_name",
  "practice_url",
  "listening_url",
  "referral_url",
  "referral_code",
] as const;

export type ReminderMergeTagKey = (typeof REMINDER_MERGE_TAG_KEYS)[number];

export const REMINDER_MERGE_TAG_HELP: Record<
  ReminderMergeTagKey,
  { label: string; example: string }
> = {
  first_name: { label: "First name", example: "Alex" },
  practice_url: { label: "Practice hub", example: "https://celpippracticetest.com/practice-overview" },
  listening_url: { label: "Listening practice", example: "https://celpippracticetest.com/listening" },
  referral_url: {
    label: "Personal referral link",
    example: "https://celpippracticetest.com/referral/?ref=ABC123&inviter=Alex",
  },
  referral_code: { label: "Referral code", example: "ABC123" },
};

export function resolveReminderSiteOrigin(): string {
  const base =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://celpippracticetest.com";
  return base.replace(/\/+$/, "");
}

export function buildReferralLink(
  siteOrigin: string,
  code: string,
  inviterName: string
): string {
  const origin = siteOrigin.replace(/\/+$/, "");
  return `${origin}/referral/?ref=${encodeURIComponent(code)}&inviter=${encodeURIComponent(inviterName)}`;
}

export function buildReminderMergeFields(input: {
  firstName?: string;
  email?: string;
  siteOrigin?: string;
  referralCode?: string;
  referralUrl?: string;
}): Record<string, string> {
  const origin = (input.siteOrigin || resolveReminderSiteOrigin()).replace(/\/+$/, "");
  const localPart = input.email?.split("@")[0]?.trim() || "";
  const first = input.firstName?.trim() || localPart || "there";
  const referralCode = input.referralCode?.trim() || "";
  const referralUrl =
    input.referralUrl?.trim() ||
    (referralCode ? buildReferralLink(origin, referralCode, first) : `${origin}/referral`);

  return {
    first_name: first,
    practice_url: `${origin}/practice-overview`,
    listening_url: `${origin}/listening`,
    referral_code: referralCode,
    referral_url: referralUrl,
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
    referralCode: "ALEX2024",
  });
}
