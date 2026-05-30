import "server-only";

import documentsClient from "@/lib/appDocumentsClient";
import { buildHashedCustomerMatchCsv } from "@/lib/google-ads/customer-match-csv";
import { fetchStripePayingCustomerRecords } from "@/lib/google-ads/stripe-paying-customers";

const CACHE_ID = "stripe_paying_customers_csv";

type StripePayingCustomersCsvCache = {
  _id: string;
  csv: string;
  recordCount: number;
  generatedAt: Date;
  updatedAt: Date;
};

export async function refreshStripePayingCustomersCsvCache() {
  const records = await fetchStripePayingCustomerRecords();
  const csv = buildHashedCustomerMatchCsv(records);
  const now = new Date();

  await documentsClient
    .db()
    .collection<StripePayingCustomersCsvCache>("googleAdsCustomerMatchExports")
    .updateOne(
      { _id: CACHE_ID },
      {
        $set: {
          csv,
          recordCount: records.length,
          generatedAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

  return { recordCount: records.length, generatedAt: now.toISOString() };
}

export async function readStripePayingCustomersCsvCache() {
  const doc = await documentsClient
    .db()
    .collection<StripePayingCustomersCsvCache>("googleAdsCustomerMatchExports")
    .findOne({ _id: CACHE_ID });

  if (!doc?.csv) return null;
  return {
    csv: doc.csv,
    recordCount: doc.recordCount,
    generatedAt: doc.generatedAt,
  };
}
