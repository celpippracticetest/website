"use client";

import { useUser } from "@clerk/nextjs";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import {
  readClerkLegacyUserIdFromSupabaseUser,
  readPracticePlanFromSupabaseUser,
} from "@/lib/auth/supabase-user-plan";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

/**
 * Minimal Clerk-shaped user for client UI when the session is Supabase Auth.
 */
function clerkLikeUserFromSupabase(u: SupabaseAuthUser) {
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
  const legacyClerkId = readClerkLegacyUserIdFromSupabaseUser(u);
  const stableId = legacyClerkId ?? u.id;

  return {
    id: stableId,
    primaryEmailAddress: email ? { emailAddress: email } : null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    firstName,
    lastName,
    imageUrl,
    createdAt: new Date(u.created_at),
    publicMetadata: {
      ...meta,
      plan,
      purchaseDate,
      planType: app.planType ?? meta.planType,
      planCancelled: app.planCancelled ?? meta.planCancelled,
      planRenewsAt: app.planRenewsAt ?? meta.planRenewsAt,
      planExpiresAt: app.planExpiresAt ?? meta.planExpiresAt,
      targetCLB: app.targetCLB ?? meta.targetCLB ?? meta.targetClb,
    },
  };
}

export type HybridAuthSource = "clerk" | "supabase" | null;

export function useHybridWebUser() {
  const clerk = useUser();
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null | undefined>(
    undefined
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setSupabaseUser(null);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSupabaseUser(data.session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return useMemo(() => {
    const supaReady = supabaseUser !== undefined;
    const isLoaded = Boolean(clerk.isLoaded && supaReady);

    if (clerk.isSignedIn && clerk.user) {
      return {
        isLoaded,
        isSignedIn: true as const,
        user: clerk.user,
        authSource: "clerk" as const satisfies HybridAuthSource,
      };
    }

    if (supabaseUser) {
      return {
        isLoaded,
        isSignedIn: true as const,
        user: clerkLikeUserFromSupabase(supabaseUser) as any,
        authSource: "supabase" as const satisfies HybridAuthSource,
      };
    }

    return {
      isLoaded,
      isSignedIn: false as const,
      user: null,
      authSource: null as HybridAuthSource,
    };
  }, [clerk.isLoaded, clerk.isSignedIn, clerk.user, supabaseUser]);
}
