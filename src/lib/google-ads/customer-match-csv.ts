import "server-only";

import type { StripePayingCustomerRecord } from "@/lib/google-ads/stripe-paying-customers";

function csvCell(value: string | undefined) {
  if (!value) return "";
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildHashedCustomerMatchCsv(records: StripePayingCustomerRecord[]) {
  const lines = ["Email,First name,Surname"];

  for (const record of records) {
    lines.push(
      [
        csvCell(record.emailHash),
        csvCell(record.firstNameHash),
        csvCell(record.lastNameHash),
      ].join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}
