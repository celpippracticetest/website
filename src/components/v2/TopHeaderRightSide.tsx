"use client";
import { useState, useEffect } from "react";
import AuthButtons from "../pages/landing/AuthButtons"
import { Button } from "./Button"
import SvgCrown from "./icons/crown"
import SvgCup from "./icons/cup"
import SvgLearningGift from "@/components/icons/LearningGift"
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { useHasEverPurchased } from "@/hooks/useHasEverPurchased";

const TopHeaderRightSide = () => {
    const [mounted, setMounted] = useState(false);
    const { user, isLoaded } = useUser();
    const hasActivePlan = user?.publicMetadata?.plan === "premium" || user?.publicMetadata?.plan === "pro";
    const { hasEverPurchased } = useHasEverPurchased();

    useEffect(() => {
        setMounted(true);
    }, []);

    const showAuthPlaceholder = !mounted || !isLoaded;

    return (
        <div className="flex gap-[16px] screen744:gap-[32px] screen1280:!gap-[28px]">
            <div className="flex gap-[12px] items-center">
                <Button className="hidden screen744:!flex" round="md" href="/league" aria-label="Open League">
                    <SvgCup />
                </Button>
                {showAuthPlaceholder ? (
                    <>
                        <Skeleton className="screen744:!hidden flex w-[40px] h-[40px] rounded-sm" />
                        <Skeleton className="screen744:!flex hidden w-[100px] h-[36px] rounded-md" />
                    </>
                ) : (
                    <>
                        {!hasActivePlan && (
                            <>
                                <Button className="screen744:!hidden flex" variant="secondary" round="sm" href="/pricing" aria-label="Go to pricing">
                                    <SvgCrown />
                                </Button>
                                <Button className="screen744:!flex hidden" variant="secondary" size="sm" href="/pricing" aria-label="Go to pricing">
                                    <SvgCrown /> Pricing
                                </Button>
                            </>
                        )}
                    </>
                )}
                {user && hasEverPurchased && (
                    <>
                        <div className="screen744:!hidden flex p-[2px] bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] rounded-full">
                            <a
                                href="/earn100"
                                className="flex items-center justify-center bg-white rounded-full w-[36px] h-[36px]"
                                aria-label="Earn $100"
                            >
                                <SvgLearningGift width={22} height={22} style={{ display: 'block' }} />
                            </a>
                        </div>
                        <div className="screen744:!inline-flex hidden p-[2px] bg-gradient-to-r from-[#4A7DFF] to-[#F4845F] rounded-full">
                            <a
                                href="/earn100"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium bg-white text-[#212E42] h-[36px] px-4 text-[14px] hover:bg-gray-50 transition-all"
                                aria-label="Earn $100"
                            >
                                <SvgLearningGift width={22} height={22} className="flex-shrink-0" /> Earn $100
                            </a>
                        </div>
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
