/**
 * Distinguishes native WebView shells from the public website.
 *
 * App WebViews append `CELPIPApp/1.0` (and/or `CelpipAppWebView/1`) to the
 * system User-Agent, and may set `window.__CELPIP_APP_PLATFORM`.
 *
 * GA4's built-in `Platform` dimension stays `web` for WebViews. This value is
 * sent as user property `platform` (android_app | ios_app | web).
 */

export const CELPIP_APP_UA_TOKEN = "CELPIPApp/1.0";
export const CELPIP_APP_UA_LEGACY_TOKEN = "CelpipAppWebView";

export type AppClientPlatform = "android_app" | "ios_app" | "web";

const APP_UA_RE = /CELPIPApp\/|CelpipAppWebView/i;
const IOS_UA_RE = /iPhone|iPad|iPod/i;

declare global {
  interface Window {
    __CELPIP_APP_PLATFORM?: AppClientPlatform;
  }
}

export function parseAppClientPlatform(
  userAgent: string,
  flag?: string | null,
): AppClientPlatform {
  if (flag === "android_app" || flag === "ios_app" || flag === "web") {
    return flag;
  }
  if (!APP_UA_RE.test(userAgent)) {
    return "web";
  }
  if (IOS_UA_RE.test(userAgent)) {
    return "ios_app";
  }
  return "android_app";
}

export function getAppClientPlatform(): AppClientPlatform {
  if (typeof window === "undefined") return "web";
  return parseAppClientPlatform(
    navigator.userAgent || "",
    window.__CELPIP_APP_PLATFORM,
  );
}

export function isCelpipNativeAppClient(): boolean {
  return getAppClientPlatform() !== "web";
}

/** Persist the detected surface on `window` for later GA / IAP checks. */
export function rememberAppClientPlatform(): AppClientPlatform {
  const platform = getAppClientPlatform();
  if (typeof window !== "undefined") {
    window.__CELPIP_APP_PLATFORM = platform;
  }
  return platform;
}
