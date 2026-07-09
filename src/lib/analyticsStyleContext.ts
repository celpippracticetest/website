import { UI_AB_COOKIE, parseUiAbVariant, type UiAbVariant } from "@/lib/uiAbTest";

declare global {
  interface Window {
    /** Set by `UiVariantProvider` for GA4 event enrichment. */
    __CELPIP_ANALYTICS_STYLE?: UiAbVariant;
  }
}

export function setAnalyticsStyle(style: UiAbVariant): void {
  if (typeof window === "undefined") return;
  window.__CELPIP_ANALYTICS_STYLE = style;
}

function readStyleFromCookie(): UiAbVariant | null {
  if (typeof document === "undefined") return null;
  const escaped = UI_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escaped}=(classic|modern)`),
  );
  return match?.[1] === "classic" || match?.[1] === "modern" ? match[1] : null;
}

/** Site UI style arm for GA4 (`style` event parameter). */
export function getAnalyticsStyleContext(): { style: UiAbVariant } {
  if (typeof window !== "undefined" && window.__CELPIP_ANALYTICS_STYLE) {
    return { style: window.__CELPIP_ANALYTICS_STYLE };
  }
  return { style: parseUiAbVariant(readStyleFromCookie() ?? undefined) };
}
