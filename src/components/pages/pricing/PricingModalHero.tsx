"use client";

import CheckCircle from "@mui/icons-material/CheckCircle";
import Shield from "@mui/icons-material/Shield";
import SvgDiamond from "@/components/icons/Diamond";
import {
  pricingUpgradeUnlockFeatures,
  pricingUpgradeUnlockHeading,
} from "@/components/pages/pricing/pricingContent";
import { DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PricingModalHeroProps = {
  align?: "center" | "left";
  asPageHeading?: boolean;
};

export function PricingModalHero({ align = "left", asPageHeading = false }: PricingModalHeroProps) {
  const isLeft = align === "left";
  const titleClassName = cn(
    "border-0 p-0 text-balance font-extrabold leading-tight text-slate-900 shadow-none",
    asPageHeading ? "text-3xl md:text-4xl lg:text-[2.75rem]" : "text-xl sm:text-2xl",
    !isLeft && "mx-auto",
  );
  const title = (
    <>
      Make Your Plan <span className="text-[#2563EB]">Pro</span>
    </>
  );

  return (
    <header className={cn("pb-5 pt-2", isLeft ? "pr-0 text-left" : "px-4 pr-12 sm:px-6 sm:pr-6")}>
      {!isLeft ? (
        <div
          className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-slate-300/90"
          aria-hidden
        />
      ) : null}
      <div className={cn(isLeft ? "text-left" : "text-center")}>
        <div
          className={cn(
            "mb-3 flex items-center gap-2",
            isLeft ? "justify-start" : "justify-center",
          )}
        >
          <SvgDiamond className="-rotate-12 text-[#2563EB]" aria-hidden />
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            Simple, transparent pricing
          </span>
        </div>
        {asPageHeading ? (
          <h1 className={titleClassName}>{title}</h1>
        ) : (
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
        )}
        <div
          className={cn(
            "my-3 flex w-full flex-col gap-2 text-base font-semibold text-zinc-600 lg:text-zinc-800",
            isLeft ? "items-start text-left" : "items-center justify-center text-center",
          )}
        >
          <p className="m-0">{pricingUpgradeUnlockHeading}</p>
          {pricingUpgradeUnlockFeatures.map((feature) => (
            <div
              key={feature}
              className={cn(
                "flex items-center gap-2",
                !isLeft && "justify-center",
              )}
            >
              <CheckCircle sx={{ color: "#10B981", fontSize: 20 }} aria-hidden />
              <span className="m-0">{feature}</span>
            </div>
          ))}
          <div
            className={cn(
              "flex items-center gap-2",
              !isLeft && "justify-center",
            )}
          >
            <Shield sx={{ color: "#F4845F", fontSize: 20 }} aria-hidden />
            <span className="m-0 text-secondary2">48-Hour Money-Back Guarantee</span>
          </div>
        </div>
      </div>
    </header>
  );
}
