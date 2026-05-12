import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { ClerkUserLike } from "@/lib/migrations/clerkToSupabaseUserPayload";
import { getDb } from "@/lib/mongodb";
import { migrateClerkUsersPage } from "@/lib/migrations/clerkToSupabaseMigrationBatch";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET() {
  try {
    const authenticate = await auth();
    const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Supabase admin is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 500 }
      );
    }

    const clerk = await clerkClient();
    const list = await clerk.users.getUserList({ limit: 1 });
    const totalClerkUsers = list.totalCount ?? 0;

    const db = await getDb();
    const users = db.collection("users");
    const withClerk = await users.countDocuments({
      clerkUserId: { $exists: true, $ne: null },
    });
    const withSupaLink = await users.countDocuments({
      clerkUserId: { $exists: true, $ne: null },
      supabaseUserId: { $exists: true, $nin: [null, ""] },
    });

    return NextResponse.json({
      totalClerkUsers,
      mongoUsersWithClerkId: withClerk,
      mongoUsersLinkedToSupabase: withSupaLink,
      mongoUsersWithClerkMissingSupabaseLink: Math.max(0, withClerk - withSupaLink),
      note:
        "Passwords cannot be copied from Clerk. After migration, users should open /sign-in/forgot-supabase once (same email) to set a Supabase password, unless you send recovery links another way.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load migration status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type MigrateBody = {
  dryRun?: boolean;
  offset?: number;
  limit?: number;
  /** When a Supabase user already exists for the email, merge metadata and set `supabaseUserId` on Mongo. */
  linkExistingByEmail?: boolean;
  /** When Mongo already has `supabaseUserId`, refresh Supabase metadata from Clerk. */
  refreshMetadata?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const authenticate = await auth();
    const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            "Supabase admin is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Supabase admin client unavailable." }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as MigrateBody;
    const dryRun = Boolean(body.dryRun);
    const offset = Math.max(0, Number(body.offset) || 0);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body.limit) || DEFAULT_LIMIT));
    const linkExistingByEmail = body.linkExistingByEmail !== false;
    const refreshMetadata = Boolean(body.refreshMetadata);

    const clerk = await clerkClient();
    const page = await clerk.users.getUserList({
      limit,
      offset,
      orderBy: "-created_at",
    });

    const db = await getDb();
    const usersCollection = db.collection("users");

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

    const errors = result.errors.slice(0, 25);

    return NextResponse.json({
      success: true,
      dryRun,
      offset,
      limit,
      batchSize: result.batchSize,
      totalClerkUsers: result.totalClerkUsers,
      nextOffset: result.nextOffset,
      done: result.done,
      created: result.created,
      linkedExisting: result.linkedExisting,
      refreshed: result.refreshed,
      skippedNoEmail: result.skippedNoEmail,
      skippedAlreadyLinked: result.skippedAlreadyLinked,
      dryRunWouldCreateOrLink: result.dryRunWouldCreateOrLink,
      dryRunWouldRefresh: result.dryRunWouldRefresh,
      errors,
      errorCount: result.errors.length,
      passwordNote:
        "Newly created Supabase users receive a random password. They must use /sign-in/forgot-supabase (or you send a recovery link) before email/password sign-in works.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
