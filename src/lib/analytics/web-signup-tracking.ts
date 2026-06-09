"use client";

import { trackAuth } from "@/lib/analytics";
import type { UserData } from "@/types/analytics";

/** Set after `sign_up` so `AuthAnalyticsTracker` does not also emit `login_completed` for the same session. */
export const SUPPRESS_LOGIN_COMPLETED_ONCE_KEY = "celpip_suppress_login_completed_once";

/** Set when the user starts sign-up; consumed when a session exists (OAuth, email confirm, etc.). */
export const PENDING_WEB_SIGNUP_KEY = "celpip_pending_web_signup";
const PENDING_WEB_SIGNUP_METHOD_KEY = "celpip_pending_web_signup_method";

const ATTRIBUTION_STORAGE_KEYS = [
  "pending_gclid",
  "pending_gbraid",
  "pending_wbraid",
  "pending_google_ads_campaign_id",
  "pending_fbclid",
  "pending_msclkid",
  "pending_ttclid",
  "pending_utm_source",
  "pending_utm_medium",
  "pending_utm_campaign",
  "pending_utm_content",
  "pending_utm_term",
  "pending_entry_page",
  "pending_referrer",
  "pending_attribution_session_id",
] as const;

export type WebSignupMethod = "email" | "google" | "magic_link" | "oauth";

export type HybridUserForSignupTracking = {
  id: string;
  primaryEmailAddress?: { emailAddress: string } | null;
  firstName?: string | null;
  lastName?: string | null;
  externalAccounts?: readonly { provider: string }[];
};

function storageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Mark that the next authenticated session should fire `sign_up` (and suppress `login_completed`). */
export function markPendingWebSignup(method: WebSignupMethod): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_WEB_SIGNUP_KEY, "1");
    sessionStorage.setItem(PENDING_WEB_SIGNUP_METHOD_KEY, method);
  } catch {
    // strict privacy / private mode
  }
}

export function hasPendingWebSignup(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PENDING_WEB_SIGNUP_KEY) === "1";
  } catch {
    return false;
  }
}

function clearPendingWebSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_WEB_SIGNUP_KEY);
    sessionStorage.removeItem(PENDING_WEB_SIGNUP_METHOD_KEY);
  } catch {
    // ignore
  }
}

function readPendingSignupMethod(): WebSignupMethod | undefined {
  try {
    const raw = sessionStorage.getItem(PENDING_WEB_SIGNUP_METHOD_KEY);
    if (raw === "email" || raw === "google" || raw === "magic_link" || raw === "oauth") {
      return raw;
    }
  } catch {
    // ignore
  }
  return undefined;
}

/** Attribution captured on `/sign-in` / landing (same keys as legacy Clerk sign-up page). */
export function readPendingSignupAttributionFromStorage(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ATTRIBUTION_STORAGE_KEYS) {
    const value = storageGet(key);
    if (value) out[key.replace(/^pending_/, "")] = value;
  }
  return out;
}

export function inferSignupMethodFromHybridUser(
  user: HybridUserForSignupTracking,
  fallback: WebSignupMethod = "email"
): WebSignupMethod {
  const pending = readPendingSignupMethod();
  if (pending) return pending;

  const accounts = user.externalAccounts;
  if (accounts && accounts.length > 0) {
    const raw = String(accounts[0]?.provider ?? "").toLowerCase();
    if (raw.includes("google")) return "google";
    return "oauth";
  }
  return fallback;
}

function buildSignupUserData(user: HybridUserForSignupTracking): UserData | undefined {
  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) return undefined;
  return {
    email,
    address: {
      first_name: user.firstName?.trim() || "",
      last_name: user.lastName?.trim() || "",
    },
  };
}

/**
 * Push GA4 `sign_up`. Idempotent per `userId` via `trackAuth.signUpCompleted`.
 */
export function trackWebSignUpCompleted(
  user: HybridUserForSignupTracking,
  method?: WebSignupMethod
): void {
  const resolvedMethod = method ?? inferSignupMethodFromHybridUser(user);
  const attribution = readPendingSignupAttributionFromStorage();
  const userData = buildSignupUserData(user);

  trackAuth.signUpCompleted(user.id, resolvedMethod, userData, attribution);

  try {
    sessionStorage.setItem(SUPPRESS_LOGIN_COMPLETED_ONCE_KEY, user.id);
  } catch {
    // ignore
  }
  clearPendingWebSignup();
}

/** Fire `sign_up` when a pending sign-up flag is set and the user session is active. */
export function tryTrackPendingWebSignup(user: HybridUserForSignupTracking): boolean {
  if (!hasPendingWebSignup()) return false;
  trackWebSignUpCompleted(user);
  return true;
}
