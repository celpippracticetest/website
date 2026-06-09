import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import {
  supabaseUserToAppShape,
  type AppShapeUser,
} from "@/lib/auth/supabase-user-app-shape";
import { resolveSupabaseAuthUserId } from "@/lib/auth/resolve-supabase-auth-user-id";
import { getSql } from "@/lib/pg/pool";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/subscriptionAccess";

const APP_METADATA_PUBLIC_KEYS = new Set([
  "plan",
  "planType",
  "purchaseDate",
  "purchasedMockExamIds",
  "planCancelled",
  "planRenewsAt",
  "planExpiresAt",
  "targetCLB",
  "roles",
  "stripeCustomerId",
  "referralCode",
  "referralActive",
  "onboardingCompleted",
  "onboardingSurveyCompleted",
]);

/** Legacy Supabase `user_metadata` key used when importing accounts from the previous auth provider. */
const LEGACY_IMPORTED_PRIVATE_META_KEY = "clerk_private_metadata";

function readObject(meta: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = meta[key];
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function splitPublicMetadataPatch(publicMetadata: Record<string, unknown>): {
  app: Record<string, unknown>;
  userMeta: Record<string, unknown>;
} {
  const app: Record<string, unknown> = {};
  const userMeta: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(publicMetadata)) {
    if (APP_METADATA_PUBLIC_KEYS.has(k)) {
      app[k] = v;
    } else {
      userMeta[k] = v;
    }
  }
  return { app, userMeta };
}

function mergePrivateIntoUserMetadata(
  existingUserMeta: Record<string, unknown>,
  privatePatch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...existingUserMeta };
  const legacyPriv = {
    ...readObject(next, LEGACY_IMPORTED_PRIVATE_META_KEY),
    ...privatePatch,
  };
  next[LEGACY_IMPORTED_PRIVATE_META_KEY] = legacyPriv;
  if (privatePatch.onboarding !== undefined) {
    next.onboarding = privatePatch.onboarding;
  }
  if (privatePatch.onboardingNew !== undefined) {
    next.onboardingNew = privatePatch.onboardingNew;
  }
  return next;
}

async function loadSupabaseUserByExternalId(externalId: string): Promise<SupabaseAuthUser | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const uid = await resolveSupabaseAuthUserId(externalId);
  if (!uid) return null;
  const { data, error } = await admin.auth.admin.getUserById(uid);
  if (error || !data.user) return null;
  return data.user;
}

async function persistSupabaseUser(
  uid: string,
  patch: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    email?: string;
    password?: string;
  },
): Promise<SupabaseAuthUser | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.auth.admin.updateUserById(uid, patch);
  if (error || !data.user) return null;
  return data.user;
}

/** True when Postgres or Stripe still indicates an active paid entitlement. */
async function paidEntitlementLocked(supabaseAuthUserId: string): Promise<boolean> {
  try {
    const sql = getSql();
    const rows = await sql<{ plan: string | null; has_active: boolean }[]>`
      SELECT
        up.plan,
        EXISTS (
          SELECT 1 FROM public.stripe_subscriptions ss
          WHERE ss.customer_id = up.stripe_customer_id
            AND ss.status IN ('active', 'trialing')
        ) AS has_active
      FROM public.user_profiles up
      WHERE up.supabase_auth_user_id = ${supabaseAuthUserId}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return false;
    if (normalizePlan(row.plan) === "plus") return true;
    return row.has_active === true;
  } catch {
    return false;
  }
}

/**
 * Blocks accidental `plan: "free"` writes from attribution / onboarding / spread
 * patches while the user still has Plus in Postgres or an active Stripe sub.
 */
async function sanitizePublicMetadataPatch(
  supabaseAuthUserId: string,
  patch: Record<string, unknown>,
  options?: { allowPlanDowngrade?: boolean },
): Promise<Record<string, unknown>> {
  if (options?.allowPlanDowngrade) return patch;
  if (!("plan" in patch)) return patch;
  if (normalizePlan(String(patch.plan ?? "")) !== "free") return patch;
  if (!(await paidEntitlementLocked(supabaseAuthUserId))) return patch;

  const { plan: _removed, ...rest } = patch;
  return rest;
}

async function applyPublicMetadataPatch(
  uid: string,
  app: Record<string, unknown>,
  meta: Record<string, unknown>,
  publicMetadata: Record<string, unknown>,
  options?: { allowPlanDowngrade?: boolean },
): Promise<void> {
  const sanitized = await sanitizePublicMetadataPatch(uid, publicMetadata, options);
  const { app: appPatch, userMeta: userPatch } = splitPublicMetadataPatch(sanitized);
  Object.assign(app, appPatch);
  Object.assign(meta, userPatch);
}

export type { AppShapeUser };

export async function appUserAdmin() {
  return {
    users: {
      getUser: async (userId: string): Promise<AppShapeUser> => {
        const user = await loadSupabaseUserByExternalId(userId);
        if (!user) {
          throw new Error(`Supabase Auth user not found for id: ${userId}`);
        }
        return supabaseUserToAppShape(user);
      },

      updateUserMetadata: async (
        userId: string,
        args: {
          publicMetadata?: Record<string, unknown>;
          privateMetadata?: Record<string, unknown>;
          allowPlanDowngrade?: boolean;
        },
      ) => {
        const user = await loadSupabaseUserByExternalId(userId);
        if (!user) throw new Error(`User not found: ${userId}`);
        const uid = user.id;
        const app = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
        const meta = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;

        if (args.publicMetadata) {
          await applyPublicMetadataPatch(uid, app, meta, args.publicMetadata, {
            allowPlanDowngrade: args.allowPlanDowngrade,
          });
        }
        if (args.privateMetadata) {
          const merged = mergePrivateIntoUserMetadata(meta, args.privateMetadata);
          Object.keys(merged).forEach((k) => {
            meta[k] = merged[k];
          });
        }

        const updated = await persistSupabaseUser(uid, { app_metadata: app, user_metadata: meta });
        if (!updated) throw new Error("Failed to update user metadata");
        return supabaseUserToAppShape(updated);
      },

      updateUser: async (
        userId: string,
        args: {
          publicMetadata?: Record<string, unknown>;
          privateMetadata?: Record<string, unknown>;
          firstName?: string | null;
          lastName?: string | null;
          username?: string | null;
          primaryEmailAddressID?: string;
          unsafeMetadata?: Record<string, unknown>;
          password?: string;
          allowPlanDowngrade?: boolean;
        },
      ) => {
        const user = await loadSupabaseUserByExternalId(userId);
        if (!user) throw new Error(`User not found: ${userId}`);
        const uid = user.id;
        const app = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
        const meta = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;

        if (args.publicMetadata) {
          await applyPublicMetadataPatch(uid, app, meta, args.publicMetadata, {
            allowPlanDowngrade: args.allowPlanDowngrade,
          });
        }
        if (args.privateMetadata) {
          const merged = mergePrivateIntoUserMetadata(meta, args.privateMetadata);
          Object.keys(merged).forEach((k) => {
            meta[k] = merged[k];
          });
        }
        if (args.firstName !== undefined) {
          meta.first_name = args.firstName;
        }
        if (args.lastName !== undefined) {
          meta.last_name = args.lastName;
        }
        if (args.unsafeMetadata) {
          meta.unsafeMetadata = {
            ...(typeof meta.unsafeMetadata === "object" && meta.unsafeMetadata !== null
              ? (meta.unsafeMetadata as Record<string, unknown>)
              : {}),
            ...args.unsafeMetadata,
          };
        }

        const patch: Parameters<typeof persistSupabaseUser>[1] = {
          app_metadata: app,
          user_metadata: meta,
        };
        if (typeof args.password === "string" && args.password.length > 0) {
          patch.password = args.password;
        }
        const updated = await persistSupabaseUser(uid, patch);
        if (!updated) throw new Error("Failed to update user");
        return supabaseUserToAppShape(updated);
      },

      deleteUser: async (userId: string) => {
        const uid = await resolveSupabaseAuthUserId(userId);
        if (!uid) throw new Error(`User not found: ${userId}`);
        const admin = getSupabaseAdmin();
        if (!admin) throw new Error("Supabase admin not configured");
        const { error } = await admin.auth.admin.deleteUser(uid);
        if (error) throw error;
      },

      createUser: async (args: {
        emailAddress?: string[];
        skipPasswordRequirement?: boolean;
        legalAcceptedAt?: Date;
        password?: string;
      }) => {
        const admin = getSupabaseAdmin();
        if (!admin) throw new Error("Supabase admin not configured");
        const email = args.emailAddress?.[0]?.trim().toLowerCase();
        if (!email) throw new Error("Email required");
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          ...(args.password ? { password: args.password } : {}),
        });
        if (error || !data.user) {
          throw error ?? new Error("createUser failed");
        }
        return supabaseUserToAppShape(data.user);
      },

      getUserList: async (opts: {
        emailAddress?: string[];
        limit?: number;
        offset?: number;
        query?: string;
      }) => {
        const admin = getSupabaseAdmin();
        if (!admin) {
          return { data: [], totalCount: 0 };
        }
        const limit = Math.min(Math.max(opts.limit ?? 10, 1), 100);
        const page = Math.max(Math.floor((opts.offset ?? 0) / limit), 0);

        const { data, error } = await admin.auth.admin.listUsers({
          page: page + 1,
          perPage: limit,
        });
        if (error || !data) {
          return { data: [], totalCount: 0 };
        }

        let users = data.users;
        if (opts.emailAddress?.length) {
          const want = new Set(opts.emailAddress.map((e) => e.trim().toLowerCase()).filter(Boolean));
          users = users.filter((u) => u.email && want.has(u.email.trim().toLowerCase()));
        }
        if (opts.query) {
          const q = opts.query.trim().toLowerCase();
          users = users.filter(
            (u) =>
              u.email?.toLowerCase().includes(q) ||
              String(u.user_metadata?.full_name ?? "")
                .toLowerCase()
                .includes(q),
          );
        }

        return {
          data: users.map((u) => supabaseUserToAppShape(u)),
          totalCount: data.total ?? users.length,
        };
      },
    },

    sessions: {
      getSessionList: async (_opts: { userId: string }) => ({ data: [] as unknown[], totalCount: 0 }),
      getSession: async (_sessionId: string) => null,
      revokeSession: async (_sessionId: string) => ({}),
    },
  };
}
