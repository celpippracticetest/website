import { applyMergeTags } from "@/lib/email/resend-client";

export const ABANDONED_CART_MERGE_TAG_KEYS = [
  "first_name",
  "email",
  "checkout_url",
  "product_name",
] as const;

export type AbandonedCartMergeTagKey = (typeof ABANDONED_CART_MERGE_TAG_KEYS)[number];

export const ABANDONED_CART_MERGE_TAG_HELP: Record<
  AbandonedCartMergeTagKey,
  { label: string; example: string }
> = {
  first_name: { label: "First name", example: "Alex" },
  email: { label: "Recipient email", example: "alex@example.com" },
  checkout_url: { label: "Checkout link", example: "https://celpippracticetest.com/checkout/sample" },
  product_name: { label: "Plan or product", example: "CELPIP Practice Plus" },
};

export function buildAbandonedCartMergeFields(input: {
  firstName?: string;
  email?: string;
  checkoutUrl?: string;
  productName?: string;
}): Record<string, string> {
  const localPart = input.email?.split("@")[0]?.trim() || "";
  const first = input.firstName?.trim() || localPart || "there";

  return {
    first_name: first,
    email: input.email?.trim() || "alex@example.com",
    checkout_url: input.checkoutUrl?.trim() || "https://celpippracticetest.com/checkout/sample",
    product_name: input.productName?.trim() || "CELPIP Practice Plus",
  };
}

export function renderAbandonedCartEmail(
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
export function sampleAbandonedCartMergeFields(toEmail?: string): Record<string, string> {
  return buildAbandonedCartMergeFields({
    firstName: "Alex",
    email: toEmail || "alex@example.com",
  });
}
