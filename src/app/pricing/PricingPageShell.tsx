"use client";

import Link from "next/link";
import Image from "next/image";
import PricingPageClient from "@/components/pages/pricing/PricingPageClient";
import AuthButtons from "@/components/pages/landing/AuthButtons";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import type { SerializedPlan } from "@/types/pricing";

export default function PricingPageShell({
  plans,
  pricingAbLayout,
  pricingAbParticipatesInExperiment,
}: {
  plans: SerializedPlan[];
  pricingAbLayout: PricingAbLayout;
  pricingAbParticipatesInExperiment: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#eef2f8]">
      <header className="border-b border-[#e4e9f2] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between px-4 screen744:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/header-logo-left.png"
              alt=""
              width={32}
              height={32}
            />
            <Image
              src="/images/header-logo-right.png"
              alt="CELPIP Practice Test"
              width={84}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <AuthButtons />
          </div>
        </div>
      </header>
      <PricingPageClient
        plans={plans}
        pricingAbLayout={pricingAbLayout}
        pricingAbParticipatesInExperiment={pricingAbParticipatesInExperiment}
      />
    </div>
  );
}
