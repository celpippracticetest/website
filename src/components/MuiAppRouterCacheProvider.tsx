"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";

/**
 * Aligns Emotion/MUI `sx` style injection between SSR and the client so
 * Client Components using MUI do not hydration-mismatch under the App Router.
 *
 * Use Emotion's default cache key (`css`) to match MUI rendered from Server
 * Components / slots that are not under this provider during SSR (they get
 * the default `css-*` classes). AppRouterCacheProvider defaults to `mui`,
 * which would mismatch as `mui-*` on the client only.
 */
export default function MuiAppRouterCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider options={{ key: "css" }}>
      {children}
    </AppRouterCacheProvider>
  );
}
