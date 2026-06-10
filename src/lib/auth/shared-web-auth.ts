"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { refreshSupabaseSessionUser } from "@/lib/auth/refresh-supabase-session-user";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser-client";

type SharedAuthSnapshot = {
  user: SupabaseAuthUser | null | undefined;
};

export const sharedAuth: SharedAuthSnapshot = { user: undefined };
const listeners = new Set<() => void>();
let authListenerStarted = false;
/** Set by explicit sign-out so server snapshot cannot keep the UI signed in. */
let forceSignedOut = false;

export function emitAuthChange() {
  queueMicrotask(() => {
    for (const listener of listeners) {
      listener();
    }
  });
}

export function subscribeSharedAuth(listener: () => void) {
  listeners.add(listener);
  ensureSharedAuthListener();
  return () => {
    listeners.delete(listener);
  };
}

export function getSharedAuthSnapshot() {
  return sharedAuth.user;
}

/** Server layout / WebAuthProvider: hydrate header auth before client getUser(). */
export function seedSharedAuthUser(user: SupabaseAuthUser | null): void {
  if (user) {
    forceSignedOut = false;
  }
  sharedAuth.user = user;
  emitAuthChange();
}

/** Clears client auth after an explicit sign-out (not Supabase auto events). */
export function clearSharedAuthUser(): void {
  forceSignedOut = true;
  sharedAuth.user = null;
  emitAuthChange();
}

export function isForceSignedOut(): boolean {
  return forceSignedOut;
}

async function resolveClientAuthUser(
  supabase: NonNullable<ReturnType<typeof createBrowserSupabaseClient>>,
): Promise<SupabaseAuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) {
    return data.user;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    return sessionData.session.user;
  }

  return null;
}

export function ensureSharedAuthListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;

  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    if (sharedAuth.user === undefined) {
      sharedAuth.user = null;
      emitAuthChange();
    }
    return;
  }

  void resolveClientAuthUser(supabase).then((user) => {
    if (user) {
      sharedAuth.user = user;
      emitAuthChange();
      return;
    }
    if (sharedAuth.user === undefined) {
      sharedAuth.user = null;
      emitAuthChange();
    }
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      forceSignedOut = false;
      sharedAuth.user = session.user;
      emitAuthChange();
    } else if (event === "SIGNED_OUT" && !forceSignedOut) {
      // Browser client can emit SIGNED_OUT when only server cookies hold the session.
      // Ignore unless the user explicitly signed out via clearSharedAuthUser().
      return;
    }

    // Reload JWT metadata after sign-in or entitlement updates only.
    // Never on TOKEN_REFRESHED — that event already is a refresh; calling refreshSession
    // again causes a feedback loop and Supabase Auth 429 rate limits.
    if (
      session?.user &&
      (event === "SIGNED_IN" || event === "USER_UPDATED")
    ) {
      void refreshSupabaseSessionUser().then((refreshed) => {
        if (refreshed) {
          sharedAuth.user = refreshed;
          emitAuthChange();
        }
      });
    }
  });
}
