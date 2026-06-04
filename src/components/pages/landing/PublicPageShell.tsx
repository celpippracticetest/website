"use client";

import React from "react";
import { TopHeaderByVariant } from "@/components/ui-variant/TopHeaderByVariant";
import PublicPageFooterClient from "@/components/pages/landing/PublicPageFooterClient";
import { LandingLiveBackground } from "@/components/pages/landing/LandingLiveBackground";
import { cn } from "@/lib/utils";
import {
  useSiteHeaderMainPaddingClass,
  useSiteShellBackgroundClass,
} from "@/hooks/useSiteHeaderLayout";

export default function PublicPageShell({
  children,
  hideHeader = false,
  hideFooter = false,
  liveBackground = false,
  footer,
}: {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideFooter?: boolean;
  liveBackground?: boolean;
  footer?: React.ReactNode;
}) {
  const mainPaddingClass = useSiteHeaderMainPaddingClass(hideHeader);
  const shellBackgroundClass = useSiteShellBackgroundClass(liveBackground);

  return (
    <div
      className={cn(
        "relative min-h-screen flex flex-col",
        shellBackgroundClass,
      )}
    >
      {liveBackground && <LandingLiveBackground />}
      {!hideHeader && <TopHeaderByVariant />}
      <main
        className={cn(
          "relative z-[1] flex-grow pb-10",
          mainPaddingClass,
        )}
      >
        {children}
      </main>
      {!hideFooter && (footer ?? <PublicPageFooterClient />)}
    </div>
  );
}
