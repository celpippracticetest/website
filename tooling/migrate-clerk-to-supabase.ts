/**
 * CLI: migrate all Clerk users into Supabase Auth and link `users` app documents (same logic as
 * POST /api/admin/migrate-clerk-users-to-supabase).
 *
 * Prerequisites (env in `.env` / `.env.local` in repo root `website/`):
 * - CLERK_SECRET_KEY
 * - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - DATABASE_URL (Supabase Postgres; used to resolve duplicate emails against auth.users)
 *
 * Usage (from `website/`):
 *   yarn migrate:clerk:supabase -- --dry-run
 *   yarn migrate:clerk:supabase
 *   yarn migrate:clerk:supabase -- --refresh-metadata
 *
 * Flags:
 *   --dry-run              Count actions only; no Supabase or DB writes
 *   --refresh-metadata     Update Supabase + app user when supabaseUserId already set
 *   --no-link-existing     Do not merge/link when Supabase already has that email
 *   --limit=N              Page size (default 50, max 100)
 */

import "./bootstrap-website-env";
import { createClerkClient } from "@clerk/backend";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClerkUserLike } from "../src/lib/migrations/clerkToSupabaseUserPayload";
import { migrateClerkUsersPage } from "../src/lib/migrations/clerkToSupabaseMigrationBatch";
import { getDb } from "../src/lib/mongodb";
import { closeSql } from "../src/lib/pg/pool";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function getSupabaseServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseArgs(argv: string[]) {
  let dryRun = false;
  let refreshMetadata = false;
  let linkExistingByEmail = true;
  let limit = DEFAULT_LIMIT;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--refresh-metadata") refreshMetadata = true;
    else if (a === "--no-link-existing") linkExistingByEmail = false;
    else if (a.startsWith("--limit=")) {
      const n = Math.min(MAX_LIMIT, Math.max(1, parseInt(a.split("=")[1] || "", 10) || DEFAULT_LIMIT));
      limit = n;
    }
  }
  return { dryRun, refreshMetadata, linkExistingByEmail, limit };
}

async function main() {
  const { dryRun, refreshMetadata, linkExistingByEmail, limit } = parseArgs(process.argv);

  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    console.error("Missing CLERK_SECRET_KEY.");
    process.exit(1);
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    console.error(
      "Supabase service role not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    process.exit(1);
  }

  const clerk = createClerkClient({ secretKey: secret });
  const db = await getDb();
  const usersCollection = db.collection("users");

  let offset = 0;
  let grand = {
    created: 0,
    linkedExisting: 0,
    refreshed: 0,
    skippedNoEmail: 0,
    skippedAlreadyLinked: 0,
    dryRunWouldCreateOrLink: 0,
    dryRunWouldRefresh: 0,
    errors: 0,
  };

  for (;;) {
    const page = await clerk.users.getUserList({
      limit,
      offset,
      orderBy: "-created_at",
    });

    const result = await migrateClerkUsersPage({
      admin,
      usersCollection,
      clerkUsers: page.data as unknown as ClerkUserLike[],
      totalCount: page.totalCount,
      offset,
      dryRun,
      linkExistingByEmail,
      refreshMetadata,
    });

    grand.created += result.created;
    grand.linkedExisting += result.linkedExisting;
    grand.refreshed += result.refreshed;
    grand.skippedNoEmail += result.skippedNoEmail;
    grand.skippedAlreadyLinked += result.skippedAlreadyLinked;
    grand.dryRunWouldCreateOrLink += result.dryRunWouldCreateOrLink;
    grand.dryRunWouldRefresh += result.dryRunWouldRefresh;
    grand.errors += result.errors.length;

    console.log(
      JSON.stringify(
        {
          offset,
          batchSize: result.batchSize,
          totalClerkUsers: result.totalClerkUsers,
          done: result.done,
          batch: {
            created: result.created,
            linkedExisting: result.linkedExisting,
            refreshed: result.refreshed,
            skippedNoEmail: result.skippedNoEmail,
            skippedAlreadyLinked: result.skippedAlreadyLinked,
            dryRunWouldCreateOrLink: result.dryRunWouldCreateOrLink,
            dryRunWouldRefresh: result.dryRunWouldRefresh,
            errorCount: result.errors.length,
            errorsSample: result.errors.slice(0, 5),
          },
        },
        null,
        2
      )
    );

    if (result.errors.length) {
      for (const e of result.errors) {
        console.error(`[error] ${e.clerkUserId}: ${e.message}`);
      }
    }

    if (result.done || result.nextOffset == null) break;
    offset = result.nextOffset;
  }

  console.log("\n--- totals ---");
  console.log(JSON.stringify({ dryRun, ...grand }, null, 2));
  if (!dryRun && !refreshMetadata) {
    console.log(
      "\nNote: new Supabase users get a random password. Point users to /sign-in/forgot-supabase (same email) or send a recovery link."
    );
  }
}

main()
  .catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await closeSql().catch(() => {});
  });
