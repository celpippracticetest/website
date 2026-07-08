"use client";

import Link from "next/link";
import Image from "next/image";
import PricingPageClient from "@/components/pages/pricing/PricingPageClient";
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
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E6E6E6] bg-[#F4F7FF]">
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
            <Link
              href="/sign-in"
              className="text-[14px] font-medium text-[#37465C] hover:text-[#316BFF]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-[#316BFF] px-4 py-2 text-[14px] font-medium text-white"
            >
              Sign up free
            </Link>
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
