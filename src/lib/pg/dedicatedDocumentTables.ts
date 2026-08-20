/**
 * Dedicated Postgres tables that replace `app_documents` partitions.
 * Each table stores document-shaped rows: (mongo_id PK, body jsonb, updated_at).
 *
 * Collections already cut over to typed schemas are excluded here
 * (useractivities → user_activities, etc.).
 */

/** Logical short names that must NOT use doc_* tables (typed elsewhere). */
export const TYPED_OFF_APP_DOCUMENTS = new Set([
  "useractivities",
  "user_learning_events",
  "useractivityreminders",
  "practices",
  "exams",
  "exam-parts",
  "blogs",
  "wikiArticles",
  "answers",
]);

/** Remaining logical collections that still use the document API. */
export const DEDICATED_DOCUMENT_COLLECTIONS: readonly string[] = [
  "account_access_signals",
  "account_deletion_flow_events",
  "account_deletion_surveys",
  "account_device_restrictions",
  "cancellation_flow_events",
  "cancellation_surveys",
  "checkouts",
  "ga_user_attribution",
  "home_ab_events",
  "homepageHeroSchedules",
  "internalLinks",
  "leadCaptureConfig",
  "leadCaptureLeads",
  "marketing_assets",
  "messageCounts",
  "onboarding",
  "onboarding_new_results",
  "onboarding_results",
  "partnerCommissions",
  "partnerProgramSettings",
  "partners",
  "paypal_subscription_grants",
  "paypal_subscription_pending",
  "plans",
  "pricing_ab_events",
  "profession_pages",
  "referralCodes",
  "referralInvitations",
  "referralRewards",
  "refundRequests",
  "reminderEmailConfigs",
  "stripe_balance_transactions",
  "stripe_customers",
  "stripe_invoices",
  "stripe_prices",
  "stripe_subscriptions",
  "stripe_sync_state",
  "tasks",
  "telegram_links",
  "telegram_linking_tokens",
  "user_activity",
  "user_attribution_events",
  "useractivityreminderdispatchlocks",
  "useractivityreminderstats",
  "users",
  "userwords",
  "userwordstudyactivities",
  "withdrawalRequests",
  "worddetails",
  "abandonedCartEmailConfigs",
  "nurtureEmailConfigs",
].sort((a, b) => a.localeCompare(b));

/** Sanitize logical collection name to a safe Postgres identifier suffix. */
export function dedicatedDocumentTableSuffix(logicalShortName: string): string {
  return logicalShortName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

/** Physical table name for a logical short collection (no env prefix). */
export function dedicatedDocumentTableName(logicalShortName: string): string {
  return `doc_${dedicatedDocumentTableSuffix(logicalShortName)}`;
}

/** Strip optional `prod.` / env prefix to get the short logical name. */
export function shortCollectionName(partitionOrLogical: string): string {
  const env = process.env.APP_DOCUMENTS_DB?.trim();
  if (env && partitionOrLogical.startsWith(`${env}.`)) {
    return partitionOrLogical.slice(env.length + 1);
  }
  if (partitionOrLogical.startsWith("prod.")) {
    return partitionOrLogical.slice(5);
  }
  return partitionOrLogical;
}

export function isDedicatedDocumentCollection(partitionOrLogical: string): boolean {
  const short = shortCollectionName(partitionOrLogical);
  if (TYPED_OFF_APP_DOCUMENTS.has(short)) return false;
  return DEDICATED_DOCUMENT_COLLECTIONS.includes(short);
}

export function resolveDedicatedDocumentTable(
  partitionOrLogical: string
): string | null {
  if (!isDedicatedDocumentCollection(partitionOrLogical)) return null;
  return dedicatedDocumentTableName(shortCollectionName(partitionOrLogical));
}
