import "server-only";

import { stripe } from "@/lib/stripe";
import {
  customerMatchEmailHash,
  customerMatchNameHash,
} from "@/lib/google-ads/data-manager-client";

export type StripePayingCustomerRecord = {
  emailHash: string;
  firstNameHash?: string;
  lastNameHash?: string;
};

function nameHashes(fullName: string | null | undefined) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length < 2) return {};

  const firstNameHash = customerMatchNameHash(parts[0]);
  const lastNameHash = customerMatchNameHash(parts[parts.length - 1]);
  return {
    ...(firstNameHash ? { firstNameHash } : {}),
    ...(lastNameHash ? { lastNameHash } : {}),
  };
}

export async function fetchStripePayingCustomerRecords(): Promise<StripePayingCustomerRecord[]> {
  const byEmailHash = new Map<string, StripePayingCustomerRecord>();
  let startingAfter: string | undefined;

  while (true) {
    const invoices = await stripe.invoices.list({
      limit: 100,
      status: "paid",
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const invoice of invoices.data) {
      const email = invoice.customer_email?.trim();
      if (!email) continue;

      const emailHash = customerMatchEmailHash(email);
      if (!emailHash) continue;

      const nextRecord: StripePayingCustomerRecord = {
        emailHash,
        ...nameHashes(invoice.customer_name),
      };
      const existing = byEmailHash.get(emailHash);
      if (!existing) {
        byEmailHash.set(emailHash, nextRecord);
        continue;
      }

      byEmailHash.set(emailHash, {
        emailHash,
        firstNameHash: existing.firstNameHash ?? nextRecord.firstNameHash,
        lastNameHash: existing.lastNameHash ?? nextRecord.lastNameHash,
      });
    }

    if (!invoices.has_more || invoices.data.length === 0) break;
    startingAfter = invoices.data[invoices.data.length - 1]?.id;
  }

  return [...byEmailHash.values()].sort((a, b) => a.emailHash.localeCompare(b.emailHash));
}

export async function fetchStripePayingCustomerEmailHashes() {
  return (await fetchStripePayingCustomerRecords()).map((record) => record.emailHash);
}
