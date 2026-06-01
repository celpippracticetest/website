import { ANDROID_APP_STORE_URL } from "./storeUrls";

export const ANDROID_DOWNLOAD_BANNER_DISMISS_KEY =
  "celpip_android_download_banner_dismissed";

export const ANDROID_DOWNLOAD_BANNER_HEIGHT_PX = 48;

export const ANDROID_DOWNLOAD_BANNER_HEIGHT_CSS =
  "var(--android-download-banner-height, 0px)";

export { ANDROID_APP_STORE_URL };

export function isAndroidMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent;
  if (!/android/i.test(userAgent)) return false;

  // Skip Android WebView — user already has the native app open.
  if (/;\s*wv\)/i.test(userAgent)) return false;

  return window.matchMedia("(max-width: 743px)").matches;
}

export function isAndroidDownloadBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ANDROID_DOWNLOAD_BANNER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAndroidDownloadBanner(): void {
  try {
    localStorage.setItem(ANDROID_DOWNLOAD_BANNER_DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}
