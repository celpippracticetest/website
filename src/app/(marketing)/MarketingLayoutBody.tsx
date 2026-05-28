"use client";

import React from "react";
import { usePathname } from "next/navigation";
import PublicPageShell from "@/components/pages/landing/PublicPageShell";

/** Routes where the global marketing header should not render */
const HIDE_HEADER_PREFIXES = ["/landing/express-entry"];

function shouldHideHeader(pathname: string) {
  return HIDE_HEADER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function MarketingLayoutBody({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const hideHeader = shouldHideHeader(pathname);

  return (
    <PublicPageShell hideHeader={hideHeader} footer={footer}>
      {children}
    </PublicPageShell>
  );
}
