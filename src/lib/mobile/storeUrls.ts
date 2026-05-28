/** Google Play listing for the CELPIP Android app. */
export const ANDROID_APP_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.celpippt.app";

export function getIosAppStoreUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_IOS_APP_URL?.trim();
  return url || undefined;
}
