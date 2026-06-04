"use client";

import { useUiVariant } from "@/components/ui-variant/UiVariantProvider";
import {
  getSiteHeaderMainPaddingClass,
  getSiteShellBackgroundClass,
} from "@/lib/uiHeaderLayout";

export function useSiteHeaderMainPaddingClass(hideHeader = false): string {
  return getSiteHeaderMainPaddingClass(useUiVariant(), hideHeader);
}

export function useSiteShellBackgroundClass(liveBackground: boolean): string {
  return getSiteShellBackgroundClass(useUiVariant(), liveBackground);
}
