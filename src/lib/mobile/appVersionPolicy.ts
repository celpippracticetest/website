export type MobilePlatform = "android" | "ios";

const DEFAULT_UPDATE_MESSAGE =
  "A new version of CELPIP is available. Please update to continue.";

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Minimum Android `versionCode` / iOS build number required to use the app.
 * Set `MOBILE_MIN_BUILD_ANDROID` / `MOBILE_MIN_BUILD_IOS` to force updates.
 * `0` means no force-update gate.
 */
export function getMinimumBuildNumber(platform: MobilePlatform): number {
  if (platform === "android") {
    return readPositiveInt(process.env.MOBILE_MIN_BUILD_ANDROID, 0);
  }
  return readPositiveInt(process.env.MOBILE_MIN_BUILD_IOS, 0);
}

export function getStoreUrl(platform: MobilePlatform): string {
  if (platform === "android") {
    return (
      process.env.MOBILE_ANDROID_STORE_URL?.trim() ||
      process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim() ||
      "https://play.google.com/store/apps/details?id=com.celpippt.app"
    );
  }
  return (
    process.env.MOBILE_IOS_STORE_URL?.trim() ||
    process.env.NEXT_PUBLIC_IOS_APP_URL?.trim() ||
    "https://apps.apple.com/us/developer/ben-wallenberg/id1447093082"
  );
}

export function getUpdateMessage(): string {
  return process.env.MOBILE_FORCE_UPDATE_MESSAGE?.trim() || DEFAULT_UPDATE_MESSAGE;
}

/** Best-effort platform from UA when `?platform=` is omitted. */
export function resolveMobilePlatform(userAgent: string): MobilePlatform | null {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (
    ua.includes("iphone") ||
    ua.includes("ipad") ||
    ua.includes("ipod") ||
    (ua.includes("mac os") && ua.includes("mobile"))
  ) {
    return "ios";
  }
  return null;
}
