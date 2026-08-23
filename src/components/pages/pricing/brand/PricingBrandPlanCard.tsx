"use client";

import { useCallback } from "react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { submitPlanCheckout } from "@/lib/planCheckout";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import type { SerializedPlan } from "@/types/pricing";
import { cn } from "@/lib/utils";
import { PricingBrandFeatureList } from "./PricingBrandFeatureList";

type PlanTint = {
  tint: string;
  tintText: string;
};

type PricingBrandPlanCardProps = {
  name: string;
  price: string;
  priceSuffix: string;
  perWeekEquivalent?: string;
  saveLabel?: string | null;
  plan?: SerializedPlan | null;
  pricingCheckoutFields?: Record<string, string>;
  features: readonly string[];
  highlighted?: boolean;
  badge?: string;
  tint: PlanTint;
};

export function PricingBrandPlanCard({
  name,
  price,
  priceSuffix,
  perWeekEquivalent = "",
  saveLabel,
  plan,
  pricingCheckoutFields,
  features,
  highlighted = false,
  badge,
  tint,
}: PricingBrandPlanCardProps) {
  const { isSignedIn, isLoaded } = useHybridWebUser();
  const attribution = useCheckoutAttributionPayload();

  const canCheckout = Boolean(
    plan?.stripePriceId ||
    plan?.stripeProductId ||
    (plan?.type && plan.type !== "Free"),
  );

  const onCheckout = useCallback(() => {
    if (!plan) return;
    submitPlanCheckout({
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId,
      legacyType: plan.type,
      itemName: plan.planTitle || plan.title || name,
      itemPrice: plan.price,
      extraFields: pricingCheckoutFields,
      attributionFields: attribution,
      isLoaded,
      isSignedIn,
    });
  }, [attribution, isLoaded, isSignedIn, name, plan, pricingCheckoutFields]);

  return (
    <article
      className={cn(
        "relative flex w-full max-w-[340px] min-w-[230px] flex-1 flex-col rounded-[20px] bg-white p-[26px]",
        highlighted
          ? "border-2 border-[#4d7ef7] shadow-[0_18px_40px_rgba(77,126,247,0.18)]"
          : "border border-[#eceff5] shadow-[0_8px_24px_rgba(26,34,51,0.06)]",
      )}
    >
      {highlighted && badge ? (
        <span className="absolute -top-[13px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#4d7ef7] px-4 py-[5px] text-[12px] font-bold tracking-[0.04em] text-white">
          {badge}
        </span>
      ) : null}

      <div
        className="-mx-[26px] -mt-[26px] mb-0 flex items-center gap-2 rounded-t-[18px] px-[26px] py-4"
        style={{ background: tint.tint }}
      >
        <span
          className="text-[17px] font-bold"
          style={{ color: tint.tintText }}
        >
          {name}
        </span>
        {saveLabel ? (
          <span className="rounded-full bg-[#e9f9ef] px-[9px] py-[3px] text-[11px] font-bold text-[#2e9e5b]">
            {saveLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-[34px] font-extrabold tracking-[-0.02em] text-[#111827]">
          {price}
        </span>
        <span className="text-sm font-medium text-[#98a2b3]">
          {priceSuffix}
        </span>
      </div>

      <div className="mt-0.5 min-h-4 text-xs text-[#98a2b3]">
        {perWeekEquivalent}
      </div>

      <button
        type="button"
        disabled={!canCheckout || !isLoaded}
        data-stripe-price={plan?.stripePriceId ?? ""}
        data-stripe-product={plan?.stripeProductId ?? ""}
        data-plan-type={plan?.type ?? ""}
        onClick={onCheckout}
        className={cn(
          "mt-[18px] w-full cursor-pointer rounded-full border-0 px-0 py-[13px] text-sm font-semibold text-white shadow-[0_6px_14px_rgba(77,126,247,0.28)] transition-[transform,background] duration-150 ease-out enabled:hover:-translate-y-px enabled:hover:bg-[#3d6fe8] disabled:cursor-not-allowed disabled:opacity-60",
          highlighted
            ? "bg-[linear-gradient(180deg,#5b8df7,#4d7ef7)]"
            : "bg-[#5b8df7]",
        )}
      >
        Get Premium
      </button>

      <PricingBrandFeatureList items={features} />
    </article>
  );
}
