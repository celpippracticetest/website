/**
 * Distinguishes native WebView shells from the public website.
 *
 * App WebViews append `CELPIPApp/1.0` (and/or `CelpipAppWebView/1`) to the
 * system User-Agent, and may set `window.__CELPIP_APP_PLATFORM`.
 *
 * GA4's built-in `Platform` dimension stays `web` for WebViews. This value is
 * sent as event parameter and user property `app_platform`
 * (android_app | ios_app | web). The live GA4 property registers it as an
 * EVENT custom dimension.
 */

export const CELPIP_APP_UA_TOKEN = "CELPIPApp/1.0";
export const CELPIP_APP_UA_LEGACY_TOKEN = "CelpipAppWebView";

export type AppClientPlatform = "android_app" | "ios_app" | "web";

const APP_UA_RE = /CELPIPApp\/|CelpipAppWebView/i;
const IOS_UA_RE = /iPhone|iPad|iPod|iOS|iPadOS/i;
const ANDROID_UA_RE = /Android/i;
const IPAD_DESKTOP_UA_RE = /Macintosh/i;

declare global {
  interface Window {
    __CELPIP_APP_PLATFORM?: AppClientPlatform;
  }
}

function platformFromAppUserAgent(userAgent: string): AppClientPlatform {
  if (IOS_UA_RE.test(userAgent) || IPAD_DESKTOP_UA_RE.test(userAgent)) {
    return "ios_app";
  }
  if (ANDROID_UA_RE.test(userAgent)) {
    return "android_app";
  }
  return "android_app";
}

export function parseAppClientPlatform(
  userAgent: string,
  flag?: string | null,
): AppClientPlatform {
  const fromFlag = normalizeAppClientPlatform(flag);
  // Native JS inject is authoritative for the shell. Ignore a sticky `web`
  // default so a later UA suffix (or inject) can still count as iOS/Android.
  if (fromFlag === "android_app" || fromFlag === "ios_app") {
    return fromFlag;
  }
  if (APP_UA_RE.test(userAgent)) {
    return platformFromAppUserAgent(userAgent);
  }
  return "web";
}

export function normalizeAppClientPlatform(
  value: unknown,
): AppClientPlatform | undefined {
  if (value === "android_app" || value === "ios_app" || value === "web") {
    return value;
  }
  return undefined;
}

export function appPlatformFromUserMetadata(
  meta: Record<string, unknown> | null | undefined,
): AppClientPlatform | undefined {
  if (!meta) return undefined;
  return (
    normalizeAppClientPlatform(meta.app_platform) ??
    normalizeAppClientPlatform(meta.platform)
  );
}

/** User-metadata payload so server-side `sign_up` can include `app_platform`. */
export function appPlatformUserMetadata(): { app_platform: AppClientPlatform } {
  return { app_platform: rememberAppClientPlatform() };
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
