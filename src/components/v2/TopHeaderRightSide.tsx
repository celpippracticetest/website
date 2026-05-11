"use client";
import { useState, useEffect } from "react";
import AuthButtons from "../pages/landing/AuthButtons";
import { Button } from "./Button";
import SvgCrown from "./icons/crown";
import SvgCup from "./icons/cup";
import SvgLearningGift from "@/components/icons/LearningGift";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { isPaidClerkSubscriptionPlan } from "@/lib/clerkSubscriptionPlan";
import { HomePricingPlansModal } from "@/components/pages/landing/HomePricingPlansModal";

const TopHeaderRightSide = () => {
  const [mounted, setMounted] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const { user, isLoaded } = useHybridWebUser();
  const showPricingCta =
    !user || !isPaidClerkSubscriptionPlan(user.publicMetadata?.plan);
  const { hasEverPurchased } = useHasEverPurchased();

  useEffect(() => {
    setMounted(true);
  }, []);

  const showAuthPlaceholder = !mounted || !isLoaded;

  return (
    <div className="flex gap-[16px] screen744:gap-[32px] screen1280:!gap-[28px]">
      <div className="flex gap-[12px] items-center">
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
            <Skeleton className="screen744:!hidden flex h-[40px] w-[40px] rounded-sm" />
            <Skeleton className="screen744:!flex hidden h-[36px] w-[100px] rounded-md" />
          </>
        ) : (
          <>
            {showPricingCta && (
              <>
                <Button
                  type="button"
                  className="screen744:!hidden flex"
                  variant="secondary"
                  round="sm"
                  aria-label="View pricing plans"
                  onClick={() => setPricingModalOpen(true)}
                >
                  <SvgCrown />
                </Button>
                <Button
                  type="button"
                  className="screen744:!flex hidden"
                  variant="secondary"
                  size="sm"
                  aria-label="View pricing plans"
                  onClick={() => setPricingModalOpen(true)}
                >
                  <SvgCrown /> Pricing
                </Button>
              </>
            )}
          </>
        )}
        {user && hasEverPurchased && (
          <>
            <div className="screen744:!hidden flex rounded-full bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] p-[2px]">
              <a
                href="/earn100"
                className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white"
                aria-label="Earn $100"
              >
                <SvgLearningGift width={22} height={22} style={{ display: "block" }} />
              </a>
            </div>
            <div className="screen744:!inline-flex hidden rounded-full bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] p-[2px]">
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
        <AuthButtons />
      </div>
      <HomePricingPlansModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  );
};

export { TopHeaderRightSide };
