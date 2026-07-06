"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readLegacyImportedExternalUserId,
  readPracticePlanFromSupabaseUser,
} from "@/lib/auth/supabase-user-plan";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

/**
 * Bridge user for client UI when the session is Supabase Auth.
 */
function bridgeUserFromSupabase(u: SupabaseAuthUser) {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const app = (u.app_metadata ?? {}) as Record<string, unknown>;
  const { plan, purchaseDate } = readPracticePlanFromSupabaseUser(u);

  const given =
    (typeof meta.given_name === "string" && meta.given_name) ||
    (typeof meta.first_name === "string" && meta.first_name) ||
    (typeof meta.firstName === "string" && meta.firstName) ||
    null;
  const family =
    (typeof meta.family_name === "string" && meta.family_name) ||
    (typeof meta.last_name === "string" && meta.last_name) ||
    (typeof meta.lastName === "string" && meta.lastName) ||
    null;
  const full =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;

  let firstName = given;
  let lastName = family;
  if (!firstName && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? null;
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }

  const imageUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;

  const email = u.email?.trim() ?? "";
  const legacyImportedId = readLegacyImportedExternalUserId(u);
  const stableId = legacyImportedId ?? u.id;

  const legacyPublicMeta = (meta.clerk_public_metadata ?? {}) as Record<string, unknown>;
  const purchasedMockExamIds =
    app.purchasedMockExamIds ?? legacyPublicMeta.purchasedMockExamIds ?? meta.purchasedMockExamIds;

  const roleList = Array.isArray(app.roles)
    ? app.roles
    : Array.isArray(meta.roles)
      ? meta.roles
      : undefined;

  const publicMetadata: Record<string, unknown> = {
    ...meta,
    plan,
    purchaseDate,
    planType: app.planType ?? meta.planType,
    planCancelled: app.planCancelled ?? meta.planCancelled,
    planRenewsAt: app.planRenewsAt ?? meta.planRenewsAt,
    planExpiresAt: app.planExpiresAt ?? meta.planExpiresAt,
    targetCLB: app.targetCLB ?? meta.targetCLB ?? meta.targetClb,
    ...(purchasedMockExamIds !== undefined ? { purchasedMockExamIds } : {}),
  };
  if (roleList !== undefined) {
    publicMetadata.roles = roleList;
  }

  return {
    id: stableId,
    primaryEmailAddressId: "primary",
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email
      ? [{ id: "primary", emailAddress: email, verification: { status: "verified" as const } }]
      : [],
    firstName,
    lastName,
    imageUrl,
    createdAt: new Date(u.created_at),
    publicMetadata,
    privateMetadata: {
      stripeCustomerId:
        (app.stripeCustomerId as string | undefined) ??
        (meta.stripeCustomerId as string | undefined) ??
        null,
    },
    externalAccounts: [] as { provider: string }[],
    passwordEnabled: true,
    reload: async () => {},
  };
}

export type HybridAuthSource = "supabase" | null;

/** Prefer `getUser()` so plan/app_metadata match the server after checkout webhooks. */
async function resolveFreshSupabaseUser(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>
): Promise<SupabaseAuthUser | null> {
  const { data: userData, error } = await supabase.auth.getUser();
  if (!error && userData.user) {
    return userData.user;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.user ?? null;
}

export function useHybridWebUser() {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null | undefined>(
    undefined
  );

  const reloadUser = useCallback(async () => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setSupabaseUser(null);
      return;
    }
    const fresh = await resolveFreshSupabaseUser(supabase);
    setSupabaseUser(fresh);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setSupabaseUser(null);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void resolveFreshSupabaseUser(supabase).then(setSupabaseUser);
    });

    void resolveFreshSupabaseUser(supabase).then(setSupabaseUser);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return useMemo(() => {
    const supaReady = supabaseUser !== undefined;
    const isLoaded = supaReady;

    if (supabaseUser) {
      const user = bridgeUserFromSupabase(supabaseUser);
      user.reload = reloadUser;
      return {
        isLoaded,
        isSignedIn: true as const,
        user: user as any,
        reloadUser,
        authSource: "supabase" as const satisfies HybridAuthSource,
      };
    }

    return {
      isLoaded,
      isSignedIn: false as const,
      user: null,
      reloadUser,
      authSource: null as HybridAuthSource,
    };
  }, [supabaseUser, reloadUser]);
}
