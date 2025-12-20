"use client";
import AuthButtons from "../pages/landing/AuthButtons"
import { Button } from "./Button"
import SvgCrown from "./icons/crown"
import SvgCup from "./icons/cup"
import useStore from "@/store";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";

const TopHeaderRightSide = () => {
    const setPremiumPlanModalState = useStore((state) => state.setPremiumPlanModalState);
    const { user, isLoaded } = useUser();
    const hasActivePlan = user?.publicMetadata?.plan === "premium" || user?.publicMetadata?.plan === "pro";

    return (
        <div className="flex gap-[16px] screen744:gap-[32px] screen1280:!gap-[28px]">
            <div className="flex gap-[12px] items-center">
                <Button className="hidden screen744:!flex" round="md" href="/league" aria-label="Open League">
                    <SvgCup />
                </Button>
                {!isLoaded ? (
                    <>
                        <Skeleton className="screen744:!hidden flex w-[40px] h-[40px] rounded-sm" />
                        <Skeleton className="screen744:!flex hidden w-[100px] h-[36px] rounded-md" />
                    </>
                ) : !hasActivePlan && (
                    <>
                        <Button className="screen744:!hidden flex" variant="secondary" round="sm" onClick={() => setPremiumPlanModalState()} aria-label="Open Premium Plans">
                            <SvgCrown />
                        </Button>
                        <Button className="screen744:!flex hidden" variant="secondary" size="sm" onClick={() => setPremiumPlanModalState()} aria-label="Open Premium Plans">
                            <SvgCrown /> Pricing
                        </Button>
                    </>
                )}
            </div>
            <div className="h-[40px] flex items-center justify-center">
                <AuthButtons />
            </div>
        </div>
    )
}

export { TopHeaderRightSide }
