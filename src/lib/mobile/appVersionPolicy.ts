import { ANDROID_APP_STORE_URL, getIosAppStoreUrl } from "./storeUrls";

export type MobilePlatform = "android" | "ios";

export function resolveMobilePlatform(
  userAgent: string,
): MobilePlatform | null {
  if (/android/i.test(userAgent)) {
    return "android";
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }
  return null;
}

function parsePositiveInt(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Minimum native build number (Android versionCode / iOS CFBundleVersion). */
export function getMinimumBuildNumber(platform: MobilePlatform): number {
  const platformKey =
    platform === "android"
      ? "MOBILE_MIN_ANDROID_BUILD_NUMBER"
      : "MOBILE_MIN_IOS_BUILD_NUMBER";
  const platformValue = parsePositiveInt(process.env[platformKey]);
  if (platformValue > 0) {
    return platformValue;
  }
  return parsePositiveInt(process.env.MOBILE_MIN_BUILD_NUMBER);
}

export function getStoreUrl(platform: MobilePlatform): string {
  if (platform === "android") {
    return ANDROID_APP_STORE_URL;
  }
  return getIosAppStoreUrl() ?? ANDROID_APP_STORE_URL;
}

export function getUpdateMessage(): string | undefined {
  const message = process.env.MOBILE_UPDATE_MESSAGE?.trim();
  return message || undefined;
}
