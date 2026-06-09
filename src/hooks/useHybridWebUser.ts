"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
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
  };
}

export type HybridAuthSource = "supabase" | null;

type SharedAuthSnapshot = {
  user: SupabaseAuthUser | null | undefined;
};

const sharedAuth: SharedAuthSnapshot = { user: undefined };
const listeners = new Set<() => void>();
let authListenerStarted = false;

function emitAuthChange() {
  // Defer so Supabase auth callbacks never update subscribers mid-mount (React 19).
  queueMicrotask(() => {
    for (const listener of listeners) {
      listener();
    }
  });
}

function subscribeSharedAuth(listener: () => void) {
  listeners.add(listener);
  ensureSharedAuthListener();
  return () => {
    listeners.delete(listener);
  };
}

function getSharedAuthSnapshot() {
  return sharedAuth.user;
}

function ensureSharedAuthListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    sharedAuth.user = null;
    emitAuthChange();
    return;
  }

  void supabase.auth.getSession().then(({ data }) => {
    sharedAuth.user = data.session?.user ?? null;
    emitAuthChange();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    sharedAuth.user = session?.user ?? null;
    emitAuthChange();
  });
}

export function useHybridWebUser() {
  const supabaseUser = useSyncExternalStore(
    subscribeSharedAuth,
    getSharedAuthSnapshot,
    () => undefined as SupabaseAuthUser | null | undefined
  );

  useEffect(() => {
    ensureSharedAuthListener();
  }, []);

  return useMemo(() => {
    const supaReady = supabaseUser !== undefined;
    const isLoaded = supaReady;

    if (supabaseUser) {
      return {
        isLoaded,
        isSignedIn: true as const,
        user: bridgeUserFromSupabase(supabaseUser) as any,
        authSource: "supabase" as const satisfies HybridAuthSource,
      };
    }

    return {
      isLoaded,
      isSignedIn: false as const,
      user: null,
      authSource: null as HybridAuthSource,
    };
  }, [supabaseUser]);
}
