import { applyMergeTags } from "@/lib/email/resend-client";

export const NURTURE_MERGE_TAG_KEYS = [
  "first_name",
  "pricing_url",
  "practice_url",
  "listening_url",
] as const;

export type NurtureMergeTagKey = (typeof NURTURE_MERGE_TAG_KEYS)[number];

export const NURTURE_MERGE_TAG_HELP: Record<
  NurtureMergeTagKey,
  { label: string; example: string }
> = {
  first_name: { label: "First name", example: "Alex" },
  pricing_url: { label: "Pricing page", example: "https://celpippracticetest.com/pricing" },
  practice_url: { label: "Practice hub", example: "https://celpippracticetest.com/practice-overview" },
  listening_url: { label: "Listening practice", example: "https://celpippracticetest.com/listening" },
};

export function resolveNurtureSiteOrigin(): string {
  const base =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://celpippracticetest.com";
  return base.replace(/\/+$/, "");
}

export function buildNurtureMergeFields(input: {
  firstName?: string;
  email?: string;
  siteOrigin?: string;
}): Record<string, string> {
  const origin = (input.siteOrigin || resolveNurtureSiteOrigin()).replace(/\/+$/, "");
  const localPart = input.email?.split("@")[0]?.trim() || "";
  const first =
    input.firstName?.trim() || localPart || "there";

  return {
    first_name: first,
    pricing_url: `${origin}/pricing`,
    practice_url: `${origin}/practice-overview`,
    listening_url: `${origin}/listening`,
  };
}

export function renderNurtureEmail(
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
export function sampleNurtureMergeFields(): Record<string, string> {
  return buildNurtureMergeFields({
    firstName: "Alex",
    email: "alex@example.com",
  });
}
