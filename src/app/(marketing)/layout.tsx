import React from "react";
import MarketingLayoutBody from "./MarketingLayoutBody";
import { PUBLIC_PAGE_CACHE_HEADERS } from "@/lib/publicPageCache";

/** Keep in sync with `PUBLIC_PAGE_REVALIDATE_SECONDS` in `@/lib/publicPageCache`. */
export const revalidate = 3600;

export async function headers() {
  return PUBLIC_PAGE_CACHE_HEADERS;
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingLayoutBody>{children}</MarketingLayoutBody>;
}
