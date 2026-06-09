"use client";

/**
 * Observe auth state and track login / logout / sign_up in GA4.
 * `sign_up` fires from `trackWebSignUpCompleted` after Supabase sign-up (or pending OAuth/email confirm).
 */

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import {
  SUPPRESS_LOGIN_COMPLETED_ONCE_KEY,
  tryTrackPendingWebSignup,
} from "@/lib/analytics/web-signup-tracking";
import { useEffect, useRef } from "react";
import { setGa4UserId } from "@/lib/ga4Browser";
import { trackAuth } from "@/lib/analytics";

export { SUPPRESS_LOGIN_COMPLETED_ONCE_KEY };

function inferAuthMethod(u: {
  externalAccounts?: readonly { provider: string }[];
}): string {
  const accounts = u.externalAccounts;
  if (accounts && accounts.length > 0) {
    const raw = String(accounts[0]?.provider ?? "").toLowerCase();
    if (raw.includes("google")) return "google";
    if (raw.includes("facebook")) return "facebook";
    if (raw.includes("apple")) return "apple";
    const trimmed = raw.replace(/^oauth_/, "");
    return trimmed.length > 0 ? trimmed.slice(0, 32) : "oauth";
  }
  return "email";
}

export default function AuthAnalyticsTracker() {
  const { user, isLoaded } = useHybridWebUser();
  const prevIdRef = useRef<string | null | undefined>(undefined);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    tryTrackPendingWebSignup(user);
  }, [isLoaded, user, user?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    const id = user?.id ?? null;

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevIdRef.current = id;
      return;
    }

    const prev = prevIdRef.current;

    if (prev === null && id && user) {
      try {
        const suppress = sessionStorage.getItem(SUPPRESS_LOGIN_COMPLETED_ONCE_KEY);
        if (suppress === id) {
          sessionStorage.removeItem(SUPPRESS_LOGIN_COMPLETED_ONCE_KEY);
          prevIdRef.current = id;
          return;
        }
      } catch {
        // sessionStorage unavailable (e.g. strict privacy mode)
      }

      trackAuth.loginCompleted(id, inferAuthMethod(user));
    } else if (prev && id === null) {
      trackAuth.logout(prev);
    }

    prevIdRef.current = id;
  }, [isLoaded, user, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      type AnalyticsUser = {
        id: string;
        publicMetadata?: { plan?: unknown; planType?: unknown; totalSpend?: unknown };
      };
      const w = window as Window & { __CELPIP_ANALYTICS_USER?: AnalyticsUser | null };
      if (!user) {
        w.__CELPIP_ANALYTICS_USER = null;
        setGa4UserId(null);
        return;
      }
      w.__CELPIP_ANALYTICS_USER = {
        id: user.id,
        publicMetadata: user.publicMetadata as AnalyticsUser["publicMetadata"],
      };
      setGa4UserId(user.id);
    } catch {
      // ignore
    }
  }, [user]);

  return null;
}
