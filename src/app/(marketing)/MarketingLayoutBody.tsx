"use client";

import React from "react";
import TopHeader from "@/components/pages/landing/TopHeader";
import Footer from "@/components/pages/landing/Footer";

export default function MarketingLayoutBody({
  children,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col bg-background">
      <TopHeader />
      <main className="relative z-[1] flex-grow pb-10">{children}</main>
      <Footer />
    </div>
  );
}
