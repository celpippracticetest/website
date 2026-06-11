"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { setAnalyticsStyle } from "@/lib/analyticsStyleContext";
import type { UiAbVariant } from "@/lib/uiAbTest";

const UiVariantContext = createContext<UiAbVariant>("modern");

export function UiVariantProvider({
  variant,
  children,
}: {
  variant: UiAbVariant;
  children: ReactNode;
}) {
  useEffect(() => {
    setAnalyticsStyle(variant);
  }, [variant]);

  return (
    <UiVariantContext.Provider value={variant}>{children}</UiVariantContext.Provider>
  );
}

export function useUiVariant(): UiAbVariant {
  return useContext(UiVariantContext);
}
