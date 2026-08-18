"use client";
import AuthButtons from "../pages/landing/AuthButtons";
import { Button } from "./Button";
import SvgCrown from "./icons/crown";
import useStore from "@/store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { Skeleton } from "@/components/ui/skeleton";

const TopHeaderRightSide = () => {
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState,
  );
  const { user, isLoaded } = useHybridWebUser();
  const hasActivePlan = hasPaidPracticeAccess(user?.publicMetadata?.plan);

  return (
    <div className="flex gap-[16px] screen744:gap-[32px] screen1280:!gap-[28px]">
      <div className="flex gap-[12px] items-center">
        {!isLoaded ? (
          <Skeleton className="flex h-10 w-[88px] rounded-full" />
        ) : (
          !hasActivePlan && (
            <Button
              className="h-10 w-auto min-w-0 gap-1.5 px-3 text-[13px] screen744:!px-4 screen744:!text-[14px]"
              variant="secondary"
              size="sm"
              onClick={() => setPremiumPlanModalState()}
              aria-label="Open pricing"
            >
              <SvgCrown />
              Pricing
            </Button>
          )
        )}
      </div>
      <div className="h-[40px] flex items-center justify-center">
        <AuthButtons />
      </div>
    </div>
  );
};

export { TopHeaderRightSide };
