"use client";

import React from "react";
import { usePathname } from "next/navigation";
import TopHeader from "@/components/pages/landing/TopHeader";

/** Routes where the global marketing header should not render */
const HIDE_HEADER_PREFIXES = ["/landing/express-entry"];

function shouldHideHeader(pathname: string) {
  return HIDE_HEADER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function MarketingLayoutBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const hideHeader = shouldHideHeader(pathname);

  return (
    <div className="bg-[#F4F7FF] min-h-screen flex flex-col">
      {!hideHeader && <TopHeader />}
      <main
        className={
          hideHeader
            ? "flex-grow pb-10 pt-0"
            : "flex-grow pb-10 pt-[100px]"
        }
      >
        {children}
      </main>
    </div>
  );
}
