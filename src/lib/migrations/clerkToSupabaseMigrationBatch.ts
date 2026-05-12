import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSupabaseAuthPayloadFromClerkUser, type ClerkUserLike } from "./clerkToSupabaseUserPayload";
import { getSql } from "@/lib/pg/pool";

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

export type UsersCollectionForClerkMigration = {
  findOne(filter: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean }
  ): Promise<unknown>;
};

export type MigrateClerkUsersPageInput = {
  admin: SupabaseClient;
  usersCollection: UsersCollectionForClerkMigration;
  clerkUsers: ClerkUserLike[];
  totalCount: number | null | undefined;
  offset: number;
  dryRun: boolean;
  linkExistingByEmail: boolean;
  refreshMetadata: boolean;
};

export type MigrateClerkUsersPageOutput = {
  created: number;
  linkedExisting: number;
  refreshed: number;
  skippedNoEmail: number;
  skippedAlreadyLinked: number;
  dryRunWouldCreateOrLink: number;
  dryRunWouldRefresh: number;
  errors: { clerkUserId: string; message: string }[];
  batchSize: number;
  totalClerkUsers: number;
  nextOffset: number | null;
  done: boolean;
};

/**
 * Migrates one page of Clerk users into Supabase Auth + app `users` documents (same rules as the admin API route).
 */
export async function migrateClerkUsersPage(
  input: MigrateClerkUsersPageInput
): Promise<MigrateClerkUsersPageOutput> {
  const {
    admin,
    usersCollection,
    clerkUsers,
    totalCount,
    offset,
    dryRun,
    linkExistingByEmail,
    refreshMetadata,
  } = input;

  let created = 0;
  let linkedExisting = 0;
  let refreshed = 0;
  let skippedNoEmail = 0;
  let skippedAlreadyLinked = 0;
  let dryRunWouldCreateOrLink = 0;
  let dryRunWouldRefresh = 0;
  const errors: { clerkUserId: string; message: string }[] = [];

  for (const cu of clerkUsers) {
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
      const { data: existingAuth, error: getErr } = await admin.auth.admin.getUserById(existingSupabaseId);
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
          errors.push({
            clerkUserId: cu.id,
            message: getErr?.message ?? "getUserById failed after duplicate email.",
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

  const total = totalCount ?? 0;
  const nextOffset = offset + clerkUsers.length;
  const done = nextOffset >= total;

  return {
    created,
    linkedExisting,
    refreshed,
    skippedNoEmail,
    skippedAlreadyLinked,
    dryRunWouldCreateOrLink,
    dryRunWouldRefresh,
    errors,
    batchSize: clerkUsers.length,
    totalClerkUsers: total,
    nextOffset: done ? null : nextOffset,
    done,
  };
}
