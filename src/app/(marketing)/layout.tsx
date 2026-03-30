import React from "react";
import MarketingLayoutBody from "./MarketingLayoutBody";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingLayoutBody>{children}</MarketingLayoutBody>;
}
