import React from "react";
import MarketingLayoutBody from "./MarketingLayoutBody";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";
import {
  PUBLIC_PAGE_CACHE_HEADERS,
  PUBLIC_PAGE_REVALIDATE_SECONDS,
} from "@/lib/publicPageCache";

export const revalidate = PUBLIC_PAGE_REVALIDATE_SECONDS;

export async function headers() {
  return PUBLIC_PAGE_CACHE_HEADERS;
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketingLayoutBody footer={<PublicPageFooter />}>
      {children}
    </MarketingLayoutBody>
  );
}
