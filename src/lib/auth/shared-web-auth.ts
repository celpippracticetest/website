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
  sharedAuth.user = user;
  emitAuthChange();
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
      sharedAuth.user = session.user;
      emitAuthChange();
    } else if (event === "SIGNED_OUT") {
      sharedAuth.user = null;
      emitAuthChange();
    }
    if (
      session?.user &&
      (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")
    ) {
      void refreshSupabaseSessionUser({ force: true }).then((refreshed) => {
        if (refreshed) {
          sharedAuth.user = refreshed;
          emitAuthChange();
        }
      });
    }
  });
}
