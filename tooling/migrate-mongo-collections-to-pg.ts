/**
 * Sync MongoDB document collections into Supabase Postgres `app_documents` (same keys as the app).
 * Wiki articles use `public.wiki_articles`; blog posts use `public.blogs` — run
 * `npm run migrate:mongo:wiki` / `npm run migrate:mongo:blogs` when syncing those from Mongo.
 *
 * Uses `resolveAppDocumentsPartitionKey` per logical name (honours `APP_DOCUMENTS_DB` and fallbacks).
 * BSON from the Mongo driver is normalised through the driver's bson@6 EJSON before bson@7 serialisation.
 *
 * Env: `DATABASE_URL`, `MONGODB_URI`, optional `MONGODB_DB_NAME` / `MONGODB_DB`, `APP_DOCUMENTS_DB`,
 * `MONGODB_DNS_SERVERS`.
 *
 * Usage (from `website/`):
 *   npm run migrate:mongo:app-documents -- --dry-run
 *   npm run migrate:mongo:app-documents
 *   npm run migrate:mongo:app-documents -- --collections=tasks,practices,plans
 *   npm run migrate:mongo:app-documents -- --skip=useractivities,answers
 *   npm run migrate:mongo:app-documents -- --doc-errors=throw
 */

import "./bootstrap-website-env";
import { printPostgresCollectionCounts, syncMongoCollectionsToPg } from "./mongo-pg-sync-shared";

/** Logical collection names used by the website `documentsClient.db().collection(...)` surface. */
export const DEFAULT_MONGO_PG_SYNC_COLLECTIONS: readonly string[] = [
  "account_deletion_flow_events",
  "account_deletion_surveys",
  "account_device_restrictions",
  // "account_access_signals" — relational `public.account_access_signals` (migration 20260521160000).
  // "answers" — relational `public.answers` (migrations 20260515133000, 20260521150000).
  "blog_target_keywords",
  "cancellation_flow_events",
  "cancellation_surveys",
  "checkouts",
  // "exams" / "exam-parts" / "practices" — relational `public.exams`, `public.exam_parts`, `public.practices`.
  "ga_user_attribution",
  "home_ab_events",
  "homepageHeroSchedules",
  "internalLinks",
  "leadCaptureConfig",
  "leadCaptureLeads",
  "league_group_counters",
  // "league_groups" — relational `public.league_groups` (see migration 20260519160000).
  "league_raffle_winners",
  // "leagues" / "league_seasons" — relational tables (migration 20260519164000).
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
  // "stripe_subscriptions" — relational `public.stripe_subscriptions` (migration 20260521140000).
  "stripe_sync_state",
  "tasks",
  // "user_activity" — relational `public.user_activity` (see migration 20260519161000).
  "user_attribution_events",
  // "user_learning_events" — relational `public.user_learning_events` (migration 20260519162000).
  // "useractivities" — relational `public.user_activities` (migration 20260520131000).
  "useractivityreminderdispatchlocks",
  "useractivityreminderstats",
  "useractivityreminders",
  // "user_league_points" — relational `public.user_league_points` (migration 20260519163000).
  "userwords",
  "userwordstudyactivities",
  // "users" — relational `public.user_profiles` (migration 20260520130000).
  "withdrawalRequests",
  "worddetails",
].sort((a, b) => a.localeCompare(b));

function parseCommaArg(argv: string[], prefix: string): string[] | null {
  const raw = argv.find((a) => a.startsWith(prefix));
  if (!raw) return null;
  const v = raw.slice(prefix.length).trim();
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let docErrors: "throw" | "skip" = "skip";
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    if (a === "--doc-errors=throw") docErrors = "throw";
    if (a === "--doc-errors=skip") docErrors = "skip";
  }
  const explicitFlag = argv.find((a) => a.startsWith("--collections="));
  const explicitList = explicitFlag ? parseCommaArg([explicitFlag], "--collections=") : null;
  const skip = new Set(parseCommaArg(argv, "--skip=") ?? []);

  let collections: string[];
  if (explicitFlag !== undefined) {
    if (!explicitList || explicitList.length === 0) {
      console.error("--collections= must list at least one logical collection name.");
      process.exit(1);
    }
    collections = explicitList.filter((c) => !skip.has(c));
  } else {
    collections = DEFAULT_MONGO_PG_SYNC_COLLECTIONS.filter((c) => !skip.has(c));
  }
  return { dryRun, collections, docErrors };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  const { dryRun, collections, docErrors } = parseArgs(process.argv.slice(2));

  if (!mongoUri) {
    console.log("No MONGODB_URI; printing Postgres partition row counts for the default catalog.");
    await printPostgresCollectionCounts([...DEFAULT_MONGO_PG_SYNC_COLLECTIONS]);
    return;
  }

  if (collections.length === 0) {
    console.error("No collections to sync (check --collections= / --skip=).");
    process.exit(1);
  }

  console.log(
    `Syncing ${collections.length} collection(s)${dryRun ? " (dry-run)" : ""}; doc errors: ${docErrors}.`
  );

  const { totalIns, totalUpd } = await syncMongoCollectionsToPg(collections, {
    dryRun,
    onDocError: docErrors,
  });
  console.log(
    `\nSummary: ${dryRun ? `dry-run would_insert=${totalIns} would_update=${totalUpd}` : `inserted=${totalIns} updated=${totalUpd}`}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
