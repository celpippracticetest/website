"use client";

import TopHeaderModern from "@/components/pages/landing/TopHeader";
import TopHeaderClassic from "@/components/ui-variants/classic/landing/TopHeaderClassic";
import { useUiVariant } from "@/components/ui-variant/UiVariantProvider";

export type TopHeaderByVariantProps = {
  /** `hero` = embedded in classic homepage hero; `site` = fixed layer on app/marketing pages. */
  layout?: "hero" | "site";
};

export function TopHeaderByVariant({ layout = "site" }: TopHeaderByVariantProps) {
  const variant = useUiVariant();

  if (variant === "classic") {
    return <TopHeaderClassic layout={layout} />;
  }

  return <TopHeaderModern />;
}

export default TopHeaderByVariant;
