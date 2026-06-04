import type { UiAbVariant } from "@/lib/uiAbTest";

/** Main content top padding below fixed site header (matches header height per variant). */
export function getSiteHeaderMainPaddingClass(
  variant: UiAbVariant,
  hideHeader = false,
): string {
  if (hideHeader) return "pt-0";

  if (variant === "classic") {
    return "pt-0 screen744:pt-[96px] screen1280:pt-0";
  }

  return "pt-[calc(88px+var(--android-download-banner-height,0px))] screen744:pt-[96px]";
}

export function getSiteShellBackgroundClass(
  variant: UiAbVariant,
  liveBackground: boolean,
): string {
  if (liveBackground) return "";
  return variant === "classic" ? "bg-[#F4F7FF]" : "bg-parchment";
}
