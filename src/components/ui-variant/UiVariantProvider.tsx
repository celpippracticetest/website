"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UiAbVariant } from "@/lib/uiAbTest";

const UiVariantContext = createContext<UiAbVariant>("modern");

export function UiVariantProvider({
  variant,
  children,
}: {
  variant: UiAbVariant;
  children: ReactNode;
}) {
  return (
    <UiVariantContext.Provider value={variant}>{children}</UiVariantContext.Provider>
  );
}

export function useUiVariant(): UiAbVariant {
  return useContext(UiVariantContext);
}
