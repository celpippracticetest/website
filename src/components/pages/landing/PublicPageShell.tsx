"use client";

import React from "react";
import TopHeader from "@/components/pages/landing/TopHeader";
import PublicPageFooterClient from "@/components/pages/landing/PublicPageFooterClient";
import { LandingLiveBackground } from "@/components/pages/landing/LandingLiveBackground";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "relative min-h-screen flex flex-col",
        !liveBackground && "bg-parchment",
      )}
    >
      {liveBackground && <LandingLiveBackground />}
      {!hideHeader && <TopHeader />}
      <main
        className={cn(
          "relative z-[1] flex-grow pb-10",
          hideHeader ? "pt-0" : "pt-[88px] screen744:pt-[96px]",
        )}
      >
        {children}
      </main>
      {!hideFooter && (footer ?? <PublicPageFooterClient />)}
    </div>
  );
}
