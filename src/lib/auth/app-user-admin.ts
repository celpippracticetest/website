import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import {
  supabaseUserToAppShape,
  type AppShapeUser,
} from "@/lib/auth/supabase-user-app-shape";
import {
  getAuthAdminUserById,
  invalidateAuthAdminUserCache,
  setAuthAdminUserCache,
  setCachedResolvedAuthUserId,
} from "@/lib/auth/auth-admin-user-cache";
import { resolveSupabaseAuthUserId } from "@/lib/auth/resolve-supabase-auth-user-id";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const APP_METADATA_PUBLIC_KEYS = new Set([
  "plan",
  "planType",
  "planSource",
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
  const uid = await resolveSupabaseAuthUserId(externalId);
  if (!uid) return null;
  const user = await getAuthAdminUserById(uid);
  if (!user) return null;
  // Alias the caller's id so repeat lookups skip resolve + Auth.
  setCachedResolvedAuthUserId(externalId, user.id);
  return user;
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
  if (error || !data.user) {
    invalidateAuthAdminUserCache(uid);
    return null;
  }
  setAuthAdminUserCache(data.user);
  return data.user;
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
        args: { publicMetadata?: Record<string, unknown>; privateMetadata?: Record<string, unknown> },
      ) => {
        invalidateAuthAdminUserCache(userId);
        const user = await loadSupabaseUserByExternalId(userId);
        if (!user) throw new Error(`User not found: ${userId}`);
        const uid = user.id;
        invalidateAuthAdminUserCache(uid);
        const fresh = (await getAuthAdminUserById(uid)) ?? user;
        const app = { ...(fresh.app_metadata ?? {}) } as Record<string, unknown>;
        const meta = { ...(fresh.user_metadata ?? {}) } as Record<string, unknown>;

        if (args.publicMetadata) {
          const { app: appPatch, userMeta: userPatch } = splitPublicMetadataPatch(args.publicMetadata);
          Object.assign(app, appPatch);
          Object.assign(meta, userPatch);
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
        },
      ) => {
        const user = await loadSupabaseUserByExternalId(userId);
        if (!user) throw new Error(`User not found: ${userId}`);
        const uid = user.id;
        const app = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
        const meta = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;

        if (args.publicMetadata) {
          const { app: appPatch, userMeta: userPatch } = splitPublicMetadataPatch(args.publicMetadata);
          Object.assign(app, appPatch);
          Object.assign(meta, userPatch);
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
        invalidateAuthAdminUserCache(uid);
        invalidateAuthAdminUserCache(userId);
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
        setAuthAdminUserCache(data.user);
        setCachedResolvedAuthUserId(data.user.id, data.user.id);
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
