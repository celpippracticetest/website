"use client";
import Link from "next/link";
import AuthButtons from "../pages/landing/AuthButtons";
import SvgCrown from "./icons/crown";
import useStore from "@/store";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";
import { trackCTAClick } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TopHeaderRightSide = () => {
  const setPremiumPlanModalState = useStore(
    (state) => state.setPremiumPlanModalState,
  );
  const { user, isLoaded, isSignedIn } = useHybridWebUser();
  const hasActivePlan = hasPaidPracticeAccess(user?.publicMetadata?.plan);
  const showPricing = !hasActivePlan;
  // Signed-out visitors get Pricing + Sign Up joined as one button group.
  const grouped = showPricing && !isSignedIn;

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-[12px]">
        <Skeleton className="flex h-10 w-[160px] screen744:!w-[220px] rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[12px] screen744:!gap-[20px]">
      {(showPricing || !isSignedIn) && (
        <div className="flex items-center">
          {showPricing && (
            <button
              type="button"
              onClick={() => setPremiumPlanModalState()}
              aria-label="Open pricing"
              className={cn(
                "group/pricing relative z-[1] flex items-center gap-[6px] h-10 px-3 screen744:!px-4",
                "bg-button-secondary text-white text-[13px] screen744:!text-[14px] font-medium whitespace-nowrap cursor-pointer",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),3px_3px_0_0_rgba(117,156,255,1)]",
                "transition-[border-radius,transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "hover:-translate-y-[2px] hover:brightness-[0.96] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),4px_5px_0_0_rgba(117,156,255,1)]",
                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_0_0_0_rgba(117,156,255,1)] active:duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-secondary focus-visible:ring-offset-2",
                "motion-reduce:transition-none",
                grouped ? "rounded-l-[20px] rounded-r-[6px]" : "rounded-[20px]",
              )}
            >
              <span className="flex shrink-0 origin-bottom [&>svg]:max-w-none group-hover/pricing:animate-crown-wiggle motion-reduce:!animate-none">
                <SvgCrown />
              </span>
              Pricing
            </button>
          )}

          {!isSignedIn && (
            <Link
              href="/sign-up"
              onClick={() =>
                trackCTAClick("Sign Up / Sign In", "header", {
                  itemId: "header_sign_up",
                })
              }
              className={cn(
                "group/signup flex items-center justify-center gap-[4px] h-10 px-4 screen744:!px-5",
                "bg-button-primary text-white text-[14px] font-medium whitespace-nowrap",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.2),3px_3px_0_0_rgba(117,156,255,1)]",
                "transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "hover:-translate-y-[2px] hover:brightness-[0.94] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),4px_5px_0_0_rgba(117,156,255,1)]",
                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_0_rgba(117,156,255,1)] active:duration-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-button-primary focus-visible:ring-offset-2",
                "motion-reduce:transition-none",
                grouped ? "ml-[4px] rounded-r-[20px] rounded-l-[6px]" : "rounded-[20px]",
              )}
            >
              <span id="sign-up-button" className="flex">
                Sign Up
                <span className="hidden screen744:!flex">
                  <span className="mx-1">/</span>
                  Sign In
                </span>
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Signed-in users get their profile as a separate button. */}
      {isSignedIn && (
        <div className="h-[40px] flex items-center justify-center [&>div]:!mr-0">
          <AuthButtons />
        </div>
      )}
    </div>
  );
};

export { TopHeaderRightSide };
