import React from "react";
import TopHeader from "@/components/pages/landing/TopHeader";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="bg-[#F4F7FF] min-h-screen flex flex-col">
        <TopHeader />
        <main className="flex-grow pt-[100px] pb-10">
          {children}
        </main>
      </div>
    </>
  );
}
