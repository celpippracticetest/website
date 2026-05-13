/**
 * CLI: migrate Clerk users into Supabase Auth and link `users` app documents.
 *
 * Prerequisites (`.env` / `.env.local` in repo root `website/`):
 * - CLERK_SECRET_KEY (Secret key; `sk_test_...` / `sk_live_...`, not the publishable key)
 * - Optional: CLERK_API_VERSION (defaults to `2025-11-10`, same header as @clerk/backend)
 * - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - DATABASE_URL (Supabase Postgres; used to resolve duplicate emails against auth.users)
 *
 * Usage (from `website/`):
 *   npm run migrate:clerk:supabase -- --dry-run
 *   npm run migrate:clerk:supabase -- --max-users=500 --dry-run
 *   npm run migrate:clerk:supabase:latest-500
 *
 * Flags:
 *   --dry-run              Count actions only; no Supabase or DB writes
 *   --refresh-metadata     Update Supabase + app user when supabaseUserId already set
 *   --no-link-existing     Do not merge/link when Supabase already has that email
 *   --limit=N              Page size (default 50, max 100)
 *   --max-users=N          Stop after N newest users (order: -created_at)
 */

import "./bootstrap-website-env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClerkUserLike } from "../src/lib/migrations/clerkToSupabaseUserPayload";
import { migrateClerkUsersPage } from "../src/lib/migrations/clerkToSupabaseMigrationBatch";
import { getDb } from "../src/lib/appDocumentsClient";
import { closeSql } from "../src/lib/pg/pool";

const CLERK_API_BASE = "https://api.clerk.com/v1";

/** Match @clerk/backend `SUPPORTED_BAPI_VERSION` so list/users behaves like the official SDK. */
const CLERK_API_VERSION = process.env.CLERK_API_VERSION?.trim() || "2025-11-10";

function clerkRestUserToLike(raw: Record<string, unknown>): ClerkUserLike {
  const rawEmails = raw.email_addresses ?? raw.emailAddresses;
  const emails: NonNullable<ClerkUserLike["emailAddresses"]> = [];
  if (Array.isArray(rawEmails)) {
    for (const e of rawEmails) {
      if (!e || typeof e !== "object") continue;
      const o = e as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : undefined;
      const addr =
        typeof o.email_address === "string"
          ? o.email_address
          : typeof o.emailAddress === "string"
            ? o.emailAddress
            : undefined;
      if (addr) emails.push({ id, emailAddress: addr });
    }
  }
  return {
    id: String(raw.id ?? ""),
    firstName: (raw.first_name as string) ?? (raw.firstName as string) ?? null,
    lastName: (raw.last_name as string) ?? (raw.lastName as string) ?? null,
    imageUrl: (raw.image_url as string) ?? (raw.imageUrl as string) ?? null,
    primaryEmailAddressId:
      (raw.primary_email_address_id as string) ??
      (raw.primaryEmailAddressId as string) ??
      undefined,
    emailAddresses: emails,
    publicMetadata:
      (raw.public_metadata as Record<string, unknown>) ??
      (raw.publicMetadata as Record<string, unknown>),
    privateMetadata:
      (raw.private_metadata as Record<string, unknown>) ??
      (raw.privateMetadata as Record<string, unknown>),
    unsafeMetadata:
      (raw.unsafe_metadata as Record<string, unknown>) ??
      (raw.unsafeMetadata as Record<string, unknown>),
  };
}

function clerkRequestHeaders(secretKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${secretKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Clerk-API-Version": CLERK_API_VERSION,
  };
}

function parseClerkUserListPayload(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as { data?: unknown[] }).data)) {
    return (body as { data: unknown[] }).data;
  }
  return [];
}

function readTotalCountFromListOrCountBody(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (typeof o.total_count === "number") return o.total_count;
  if (typeof o.totalCount === "number") return o.totalCount;
  return null;
}

async function clerkGetUserList(opts: {
  secretKey: string;
  limit: number;
  offset: number;
}): Promise<{ data: ClerkUserLike[]; totalCount: number }> {
  const headers = clerkRequestHeaders(opts.secretKey);
  const listUrl = new URL(`${CLERK_API_BASE}/users`);
  listUrl.searchParams.set("limit", String(opts.limit));
  listUrl.searchParams.set("offset", String(opts.offset));
  listUrl.searchParams.set("order_by", "-created_at");

  const countUrl = new URL(`${CLERK_API_BASE}/users/count`);

  const [listRes, countRes] = await Promise.all([
    fetch(listUrl, { headers }),
    fetch(countUrl, { headers }),
  ]);

  const listText = await listRes.text();
  let listBody: unknown;
  try {
    listBody = listText ? JSON.parse(listText) : {};
  } catch {
    listBody = { raw: listText };
  }
  if (!listRes.ok) {
    const msg =
      typeof listBody === "object" && listBody !== null && "errors" in listBody
        ? JSON.stringify((listBody as { errors: unknown }).errors)
        : listText.slice(0, 500);
    throw new Error(`Clerk API ${listRes.status}: ${msg}`);
  }

  const rows = parseClerkUserListPayload(listBody);

  const countText = await countRes.text();
  let countBody: unknown = {};
  try {
    countBody = countText ? JSON.parse(countText) : {};
  } catch {
    countBody = {};
  }

  if (!countRes.ok) {
    throw new Error(
      `Clerk GET /v1/users/count failed (${countRes.status}): ${countText.slice(0, 400)}. ` +
        "Pagination needs this endpoint; check CLERK_SECRET_KEY and CLERK_API_VERSION."
    );
  }

  const countFromApi = readTotalCountFromListOrCountBody(countBody);
  const listTotal = readTotalCountFromListOrCountBody(listBody);
  const totalCount =
    typeof countFromApi === "number"
      ? countFromApi
      : typeof listTotal === "number"
        ? listTotal
        : rows.length;

  return {
    data: rows.map((row) => clerkRestUserToLike(row as Record<string, unknown>)),
    totalCount,
  };
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Clerk sometimes surfaces transient TCP/TLS/DNS issues as `unexpected_error` / `fetch failed`. */
function isProbablyTransientClerkFetchError(err: unknown): boolean {
  const e = err as { message?: string; errors?: { message?: string }[] } | undefined;
  const fromClerk = e?.errors?.[0]?.message;
  const msg = `${fromClerk ?? ""} ${e?.message ?? ""} ${String(err)}`.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("eai_again") ||
    msg.includes("socket hang up") ||
    msg.includes("und_err_connect") ||
    msg.includes("und_err_socket")
  );
}

async function withTransientNetworkRetries<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { maxAttempts: number; baseDelayMs: number } = { maxAttempts: 8, baseDelayMs: 750 }
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isProbablyTransientClerkFetchError(err) || attempt === opts.maxAttempts) {
        throw err;
      }
      const delay = opts.baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[${label}] transient failure (attempt ${attempt}/${opts.maxAttempts}), waiting ${delay}ms before retry…`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}

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
  let maxUsers: number | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    if (a === "--dry-run") dryRun = true;
    else if (a === "--refresh-metadata") refreshMetadata = true;
    else if (a === "--no-link-existing") linkExistingByEmail = false;
    else if (a.startsWith("--limit=")) {
      const n = Math.min(MAX_LIMIT, Math.max(1, parseInt(a.split("=")[1] || "", 10) || DEFAULT_LIMIT));
      limit = n;
    } else if (a.startsWith("--max-users=")) {
      const n = parseInt(a.split("=")[1] || "", 10);
      if (Number.isFinite(n) && n > 0) maxUsers = n;
    }
  }
  return { dryRun, refreshMetadata, linkExistingByEmail, limit, maxUsers };
}

async function main() {
  const { dryRun, refreshMetadata, linkExistingByEmail, limit, maxUsers } = parseArgs(process.argv);

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

  const db = await getDb();
  const usersCollection = db.collection("users");

  let offset = 0;
  const grand = {
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
    const pageLimit = maxUsers != null ? Math.min(limit, maxUsers - offset) : limit;
    if (pageLimit <= 0) break;

    const page = await withTransientNetworkRetries("clerk GET /v1/users", () =>
      clerkGetUserList({ secretKey: secret, limit: pageLimit, offset })
    );

    if (!page.data.length) break;

    const result = await migrateClerkUsersPage({
      admin,
      usersCollection,
      clerkUsers: page.data,
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
          maxUsers: maxUsers ?? null,
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

    const reachedMax = maxUsers != null && offset + result.batchSize >= maxUsers;
    if (reachedMax) break;
    if (result.done || result.nextOffset == null) break;
    offset = result.nextOffset;
  }

  console.log("\n--- totals ---");
  console.log(JSON.stringify({ dryRun, maxUsers: maxUsers ?? null, ...grand }, null, 2));
  if (!dryRun && !refreshMetadata) {
    console.log(
      "\nNote: new Supabase users get a random password. Point users to password recovery (same email) or send a Supabase recovery link."
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
