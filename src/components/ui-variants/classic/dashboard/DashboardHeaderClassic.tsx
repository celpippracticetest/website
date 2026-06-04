"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import DesktopNavigation from "@/components/dashboard-new/DesktopNavigation";
import PremiumPlanModalClassic from "@/components/ui-variants/classic/landing/PremiumPlanModalClassic";
import { TopHeaderRightSideClassic } from "@/components/ui-variants/classic/landing/TopHeaderRightSideClassic";

export type DashboardHeaderClassicProps = {
  /** When true, omits the outer shell (header lives inside the dashboard content column). */
  embedded?: boolean;
};

export default function DashboardHeaderClassic({
  embedded = false,
}: DashboardHeaderClassicProps) {
  const router = useRouter();
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const headerBlock = (
    <div className="mb-[16px] w-full px-[16px] screen744:!px-0">
      <div
        className={clsx(
          "flex w-full items-center justify-between duration-1000 ease-in-out transition-all",
          "fixed left-0 right-0 top-[var(--android-download-banner-height,0px)] z-[50] h-[72px] px-[16px] screen744:!px-[24px]",
          "rounded-b-[32px] border-b border-[#D1DEFF] backdrop-blur-[8px]",
          "bg-[linear-gradient(90deg,_rgba(255,_255,_255,_0.65)_0%,_rgba(255,_255,_255,_0.2)_100%)]",
          "screen1280:!relative screen1280:!top-auto screen1280:!left-auto screen1280:!right-auto",
          "screen1280:!z-[50] screen1280:!mt-[24px] screen1280:!h-[80px] screen1280:!max-w-[1280px]",
          "screen1280:!mx-auto screen1280:!rounded-[32px] screen1280:!border screen1280:!border-[#D1DEFF]",
          "screen1280:!px-[16px] screen1280:!pl-[24px]",
        )}
      >
        <div className="flex w-full items-center gap-[12px] screen744:!gap-[24px] screen1280:!gap-[64px]">
          <Image
            onClick={() => router.push("/")}
            alt="CELPIP Practice Test"
            width={133}
            height={40}
            className="hidden opacity-100 delay-300 hover:cursor-pointer screen1280:block"
            src="/images/logo.png"
          />
          <Image
            onClick={() => router.push("/")}
            alt="CELPIP Practice Test"
            width={35}
            height={35}
            className="block opacity-100 delay-300 hover:cursor-pointer screen1280:hidden"
            src="/images/header-logo-left.png"
          />
          <DesktopNavigation />
        </div>

        <div className="flex h-[48px] items-center justify-between">
          <TopHeaderRightSideClassic
            onOpenPricing={() => setPricingModalOpen(true)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {embedded ? (
        headerBlock
      ) : (
        <div className="z-[99999999] mx-auto flex w-full max-w-[1440px] justify-center">
          {headerBlock}
        </div>
      )}
      <PremiumPlanModalClassic
        open={pricingModalOpen}
        onOpenChange={setPricingModalOpen}
      />
    </>
  );
}
