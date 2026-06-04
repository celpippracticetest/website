"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/v2/Button";
import SvgCrown from "@/components/v2/icons/crown";
import SvgCup from "@/components/v2/icons/cup";
import SvgLearningGift from "@/components/icons/LearningGift";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { isPaidSubscriptionPlan } from "@/lib/subscriptionPlan";
import AuthButtonsClassic from "./AuthButtonsClassic";

export function TopHeaderRightSideClassic({
  onOpenPricing,
}: {
  onOpenPricing: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { user, isLoaded } = useHybridWebUser();
  const hasActivePlan = user ? isPaidSubscriptionPlan(user.publicMetadata?.plan) : false;
  const { hasEverPurchased } = useHasEverPurchased();

  useEffect(() => {
    setMounted(true);
  }, []);

  const showAuthPlaceholder = !mounted || !isLoaded;

  return (
    <div className="flex gap-[16px] screen744:gap-[32px] screen1280:!gap-[28px]">
      <div className="flex items-center gap-[12px]">
        <Button
          className="hidden screen744:!flex"
          round="md"
          href="/league"
          aria-label="Open League"
        >
          <SvgCup />
        </Button>
        {showAuthPlaceholder ? (
          <>
            <Skeleton className="flex h-[40px] w-[40px] rounded-sm screen744:!hidden" />
            <Skeleton className="hidden h-[36px] w-[100px] rounded-md screen744:!flex" />
          </>
        ) : (
          !hasActivePlan && (
            <>
              <Button
                className="flex screen744:!hidden"
                variant="secondary"
                round="sm"
                type="button"
                onClick={onOpenPricing}
                aria-label="Open Premium Plans"
              >
                <SvgCrown />
              </Button>
              <Button
                className="hidden screen744:!flex"
                variant="secondary"
                size="sm"
                type="button"
                onClick={onOpenPricing}
                aria-label="Open Premium Plans"
              >
                <SvgCrown /> Pricing
              </Button>
            </>
          )
        )}
        {user && hasEverPurchased && (
          <>
            <div className="flex rounded-full bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] p-[2px] screen744:!hidden">
              <a
                href="/earn100"
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white"
                aria-label="Earn $100"
              >
                <SvgLearningGift width={22} height={22} style={{ display: "block" }} />
              </a>
            </div>
            <div className="hidden rounded-full bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] p-[2px] screen744:!inline-flex">
              <a
                href="/earn100"
                className="inline-flex h-[36px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-[14px] font-medium text-[#212E42] transition-all hover:bg-gray-50"
                aria-label="Earn $100"
              >
                <SvgLearningGift width={22} height={22} className="flex-shrink-0" /> Earn $100
              </a>
            </div>
          </>
        )}
      </div>
      <div className="flex h-[40px] items-center justify-center">
        <AuthButtonsClassic />
      </div>
    </div>
  );
}
