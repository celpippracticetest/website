"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

/**
 * Aligns Emotion/MUI `sx` style injection between SSR and the client so
 * Client Components using MUI do not hydration-mismatch under the App Router.
 */
export default function MuiAppRouterCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppRouterCacheProvider>{children}</AppRouterCacheProvider>;
}
