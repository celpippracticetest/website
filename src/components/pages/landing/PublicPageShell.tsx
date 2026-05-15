"use client";

import React from "react";
import TopHeader from "@/components/pages/landing/TopHeader";

export default function PublicPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#F4F7FF] min-h-screen flex flex-col">
      <TopHeader />
      <main className="flex-grow pb-10 pt-[88px] screen744:pt-[96px]">
        {children}
      </main>
    </div>
  );
}
