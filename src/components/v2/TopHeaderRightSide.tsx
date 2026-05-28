"use client";
import { useState, useEffect } from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AuthButtons from "../pages/landing/AuthButtons";
import { Button } from "./Button";
import SvgCup from "./icons/cup";
import SvgLearningGift from "@/components/icons/LearningGift";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { isPaidSubscriptionPlan } from "@/lib/subscriptionPlan";
import { PricingNavModal } from "@/components/pages/pricing/PricingNavModal";

const TopHeaderRightSide = () => {
  const [mounted, setMounted] = useState(false);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const { user, isLoaded } = useHybridWebUser();
  const showLeagueNav = Boolean(user);
  const showPricingCta =
    !user || !isPaidSubscriptionPlan(user.publicMetadata?.plan);
  const { hasEverPurchased } = useHasEverPurchased();

  useEffect(() => {
    setMounted(true);
  }, []);

  const showAuthPlaceholder = !mounted || !isLoaded;

  return (
    <div className="flex gap-[16px] screen744:gap-[32px] screen1280:!gap-[28px]">
      <div className="flex items-center gap-2 screen744:gap-3">
        {showLeagueNav && (
          <Button
            className="!flex !h-10 !w-10 !min-h-0 shrink-0"
            round="md"
            href="/league"
            aria-label="Open League"
          >
            <SvgCup />
          </Button>
        )}
        {showAuthPlaceholder ? (
          <>
            <Skeleton className="screen744:!hidden flex h-10 w-10 shrink-0 rounded-full" />
            <Skeleton className="screen744:!flex hidden h-10 w-[min(200px,28vw)] shrink-0 rounded-full" />
          </>
        ) : (
          <>
            {showPricingCta && (
              <>
                <Button
                  type="button"
                  variant="outlineAmber"
                  className="screen744:!hidden !flex !h-10 !w-10 !min-h-0 shrink-0 !p-0"
                  aria-label="View pricing plans"
                  onClick={() => setPricingModalOpen(true)}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 22 }} />
                </Button>
                <Button
                  type="button"
                  variant="outlineAmber"
                  size="sm"
                  className="screen744:!flex hidden !h-10 !w-auto !min-w-0 shrink-0 px-4 !text-sm !font-semibold"
                  aria-label="View pricing plans"
                  onClick={() => setPricingModalOpen(true)}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 20 }} />
                  Pricing
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
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
                aria-label="Earn $100"
              >
                <SvgLearningGift width={22} height={22} style={{ display: "block" }} />
              </a>
            </div>
            <div className="screen744:!inline-flex hidden rounded-full bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] p-[2px]">
              <a
                href="/earn100"
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-[#212E42] transition-all hover:bg-gray-50"
                aria-label="Earn $100"
              >
                <SvgLearningGift width={22} height={22} className="flex-shrink-0" /> Earn $100
              </a>
            </div>
          </>
        )}
      </div>
      <div className="flex h-10 items-center justify-center">
        <AuthButtons />
      </div>
      <PricingNavModal open={pricingModalOpen} onOpenChange={setPricingModalOpen} />
    </div>
  );
};

export { TopHeaderRightSide };
