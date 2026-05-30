import "server-only";

import type { StripePayingCustomerRecord } from "@/lib/google-ads/stripe-paying-customers";

const CSV_LINE_BREAK = "\r\n";

function csvCell(value: string | undefined) {
  if (!value) return "";
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildHashedCustomerMatchCsv(records: StripePayingCustomerRecord[]) {
  const lines = ["Email"];

  for (const record of records) {
    lines.push(csvCell(record.emailHash));
  }

  return `${lines.join(CSV_LINE_BREAK)}${CSV_LINE_BREAK}`;
}
