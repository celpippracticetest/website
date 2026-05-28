import React from "react";
import MarketingLayoutBody from "./MarketingLayoutBody";
import PublicPageFooter from "@/components/pages/landing/PublicPageFooter";

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
