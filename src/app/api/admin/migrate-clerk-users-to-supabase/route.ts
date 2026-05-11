import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  buildSupabaseAuthPayloadFromClerkUser,
  type ClerkUserLike,
} from "@/lib/migrations/clerkToSupabaseUserPayload";
import { getDb } from "@/lib/mongodb";
import { getSql } from "@/lib/pg/pool";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function isDuplicateEmailError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("email address is already") ||
    m.includes("user already registered")
  );
}

async function findSupabaseUserIdByEmail(email: string): Promise<string | null> {
  try {
    const sql = getSql();
    const rows = await sql<{ id: string }[]>`
      select id::text as id
      from auth.users
      where lower(email) = lower(${email})
      limit 1
    `;
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

function randomMigrationPassword(): string {
  return randomBytes(32).toString("hex");
}

function mergeRecord(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...base, ...patch };
}

export async function GET() {
  try {
    const authenticate = await auth();
    const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        { error: "Supabase admin is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)." },
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
        { error: "Supabase admin is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)." },
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

    let created = 0;
    let linkedExisting = 0;
    let refreshed = 0;
    let skippedNoEmail = 0;
    let skippedAlreadyLinked = 0;
    let dryRunWouldCreateOrLink = 0;
    let dryRunWouldRefresh = 0;
    const errors: { clerkUserId: string; message: string }[] = [];

    for (const clerkUser of page.data) {
      const cu = clerkUser as unknown as ClerkUserLike;
      const { email, user_metadata, app_metadata } = buildSupabaseAuthPayloadFromClerkUser(cu);

      if (!email) {
        skippedNoEmail++;
        continue;
      }

      const existingMongo = await usersCollection.findOne({ clerkUserId: cu.id });
      const existingSupabaseId =
        typeof existingMongo?.supabaseUserId === "string" ? existingMongo.supabaseUserId.trim() : "";

      if (existingSupabaseId && !refreshMetadata) {
        skippedAlreadyLinked++;
        continue;
      }

      if (existingSupabaseId && refreshMetadata) {
        if (dryRun) {
          dryRunWouldRefresh++;
          continue;
        }
        const { data: existingAuth, error: getErr } = await admin.auth.admin.getUserById(
          existingSupabaseId
        );
        if (getErr || !existingAuth.user) {
          errors.push({
            clerkUserId: cu.id,
            message: getErr?.message ?? "Supabase user from Mongo not found; clear supabaseUserId or fix id.",
          });
          continue;
        }
        const um = mergeRecord(
          (existingAuth.user.user_metadata ?? {}) as Record<string, unknown>,
          user_metadata
        );
        const am = mergeRecord(
          (existingAuth.user.app_metadata ?? {}) as Record<string, unknown>,
          app_metadata
        );
        const { error: upErr } = await admin.auth.admin.updateUserById(existingSupabaseId, {
          user_metadata: um,
          app_metadata: am,
        });
        if (upErr) {
          errors.push({ clerkUserId: cu.id, message: upErr.message });
          continue;
        }
        await usersCollection.updateOne(
          { clerkUserId: cu.id },
          {
            $set: {
              email,
              firstName: cu.firstName ?? null,
              lastName: cu.lastName ?? null,
              imageUrl: cu.imageUrl ?? null,
              publicMetadata: (cu.publicMetadata ?? {}) as Record<string, unknown>,
              plan: ((cu.publicMetadata ?? {}) as { plan?: string }).plan || "free",
              planType: ((cu.publicMetadata ?? {}) as { planType?: string | null }).planType ?? null,
              clerkMigrationMetadataSyncedAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        refreshed++;
        continue;
      }

      if (dryRun) {
        dryRunWouldCreateOrLink++;
        continue;
      }

      const publicMetadata = (cu.publicMetadata ?? {}) as Record<string, unknown>;
      const mongoBase = {
        clerkUserId: cu.id,
        email,
        firstName: cu.firstName ?? null,
        lastName: cu.lastName ?? null,
        imageUrl: cu.imageUrl ?? null,
        publicMetadata,
        plan: (publicMetadata.plan as string | undefined) || "free",
        planType: (publicMetadata.planType as string | null | undefined) ?? null,
        updatedAt: new Date(),
      };

      const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: randomMigrationPassword(),
        email_confirm: true,
        user_metadata,
        app_metadata,
      });

      if (createErr) {
        if (linkExistingByEmail && isDuplicateEmailError(createErr.message)) {
          const existingId = await findSupabaseUserIdByEmail(email);
          if (!existingId) {
            errors.push({
              clerkUserId: cu.id,
              message: `${createErr.message} (could not resolve existing Supabase user id; ensure DATABASE_URL can read auth.users, or link manually.)`,
            });
            continue;
          }
          const { data: existingAuth, error: getErr } = await admin.auth.admin.getUserById(existingId);
          if (getErr || !existingAuth.user) {
            errors.push({ clerkUserId: cu.id, message: getErr?.message ?? "getUserById failed after duplicate email." });
            continue;
          }
          const um = mergeRecord(
            (existingAuth.user.user_metadata ?? {}) as Record<string, unknown>,
            user_metadata
          );
          const am = mergeRecord(
            (existingAuth.user.app_metadata ?? {}) as Record<string, unknown>,
            app_metadata
          );
          const { error: upErr } = await admin.auth.admin.updateUserById(existingId, {
            user_metadata: um,
            app_metadata: am,
          });
          if (upErr) {
            errors.push({ clerkUserId: cu.id, message: upErr.message });
            continue;
          }
          await usersCollection.updateOne(
            { clerkUserId: cu.id },
            {
              $set: {
                ...mongoBase,
                supabaseUserId: existingId,
                clerkLinkedToExistingSupabaseAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
          linkedExisting++;
          continue;
        }

        errors.push({ clerkUserId: cu.id, message: createErr.message });
        continue;
      }

      if (!createdUser.user?.id) {
        errors.push({ clerkUserId: cu.id, message: "createUser returned no user id." });
        continue;
      }

      const supabaseUserId = createdUser.user.id;

      await usersCollection.updateOne(
        { clerkUserId: cu.id },
        {
          $set: {
            ...mongoBase,
            supabaseUserId,
            clerkMigratedToSupabaseAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
      created++;
    }

    const total = page.totalCount ?? 0;
    const nextOffset = offset + page.data.length;
    const done = nextOffset >= total;

    return NextResponse.json({
      success: true,
      dryRun,
      offset,
      limit,
      batchSize: page.data.length,
      totalClerkUsers: total,
      nextOffset: done ? null : nextOffset,
      done,
      created,
      linkedExisting,
      refreshed,
      skippedNoEmail,
      skippedAlreadyLinked,
      dryRunWouldCreateOrLink,
      dryRunWouldRefresh,
      errors: errors.slice(0, 25),
      errorCount: errors.length,
      passwordNote:
        "Newly created Supabase users receive a random password. They must use /sign-in/forgot-supabase (or you send a recovery link) before email/password sign-in works.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
