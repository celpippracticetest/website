"use client";

/**
 * Clerk’s dashboard “Google Analytics” integration is deprecated for new apps.
 * This mirrors their workaround: observe auth state and push events to the data layer.
 *
 * @see https://clerk.com/docs/integrations/google-analytics
 *
 * sign_up: GA4 Measurement Protocol from `user.created` webhook (+ optional client ads data on sign-up page).
 * login / logout: `login_completed` / `logout` in GTM (see `trackAuth` in `gtm.ts`).
 */

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { trackAuth } from "@/lib/gtm";

/** Set on the sign-up page when `signUpCompleted` runs so we do not double-count `login_completed`. */
export const CLERK_SUPPRESS_LOGIN_COMPLETED_ONCE_KEY =
  "celpip_suppress_login_completed_once";

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

export default function ClerkAuthGtmTracker() {
  const { user, isLoaded } = useUser();
  const prevIdRef = useRef<string | null | undefined>(undefined);
  const initializedRef = useRef(false);

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
        const suppress = sessionStorage.getItem(
          CLERK_SUPPRESS_LOGIN_COMPLETED_ONCE_KEY
        );
        if (suppress === id) {
          sessionStorage.removeItem(CLERK_SUPPRESS_LOGIN_COMPLETED_ONCE_KEY);
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

  return null;
}
