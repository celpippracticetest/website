"use client";

import { useCallback } from "react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { Button } from "@/components/v2/Button";
import { formatPlanCadPrice, parsePrice } from "@/lib/pricing";
import { submitPlanCheckout } from "@/lib/planCheckout";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import type { SerializedPlan } from "@/types/pricing";
import { cn } from "@/lib/utils";
import { PricingBrandFeatureList } from "./PricingBrandFeatureList";

type PricingBrandPlanCardProps = {
  name: string;
  description: string;
  price: string;
  priceSuffix?: string;
  billingNote?: string;
  ctaLabel: string;
  ctaHref?: string;
  plan?: SerializedPlan | null;
  pricingCheckoutFields?: Record<string, string>;
  features: readonly string[];
  highlighted?: boolean;
  badge?: string;
};

export function PricingBrandPlanCard({
  name,
  description,
  price,
  priceSuffix = "/mo",
  billingNote,
  ctaLabel,
  ctaHref,
  plan,
  pricingCheckoutFields,
  features,
  highlighted = false,
  badge,
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
      extraFields: pricingCheckoutFields,
      attributionFields: attribution,
      isLoaded,
      isSignedIn,
    });
  }, [attribution, isLoaded, isSignedIn, plan, pricingCheckoutFields]);

  const displayAmount =
    price === "—"
      ? "—"
      : price.startsWith("$")
        ? price.slice(1)
        : formatPlanCadPrice(price);

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-[18px] p-7 screen744:px-7 screen744:py-8",
        highlighted
          ? "z-[1] bg-[#0E2C4F] shadow-[0_20px_48px_rgba(14,44,79,0.26)] screen744:-translate-y-2"
          : "border border-[#e3e9ef] bg-white",
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#EE4266] px-4 py-1.5 text-[12.5px] font-bold text-white">
          {badge}
        </span>
      ) : null}

      <h2
        className={cn(
          "text-[19px] font-bold",
          highlighted ? "text-white" : "text-[#0E2C4F]",
        )}
      >
        {name}
      </h2>
      <p
        className={cn(
          "mt-1.5 text-[15px] leading-snug",
          highlighted ? "text-[#aebfd2]" : "text-[#5a6874]",
        )}
      >
        {description}
      </p>

      <div className="mt-6 flex items-baseline gap-1">
        <span
          className={cn(
            "text-[2.875rem] font-extrabold leading-none",
            highlighted ? "text-white" : "text-[#0E2C4F]",
          )}
        >
          ${displayAmount}
        </span>
        {priceSuffix ? (
          <span
            className={cn(
              "text-base font-semibold",
              highlighted ? "text-[#aebfd2]" : "text-text3",
            )}
          >
            {priceSuffix}
          </span>
        ) : null}
      </div>

      {billingNote ? (
        <p
          className={cn(
            "mt-0.5 text-sm",
            highlighted ? "text-[#8fa6c2]" : "text-text3",
          )}
        >
          {billingNote}
        </p>
      ) : (
        <div className="mt-0.5 h-5" aria-hidden />
      )}

      <div className="mt-6">
        {canCheckout ? (
          <Button
            type="button"
            variant={highlighted ? "primary" : "secondary"}
            size="md"
            className="w-full"
            disabled={!isLoaded}
            onClick={onCheckout}
          >
            {ctaLabel}
          </Button>
        ) : ctaHref ? (
          <Button
            variant={highlighted ? "primary" : "secondary"}
            size="md"
            href={ctaHref}
            className="w-full"
          >
            {ctaLabel}
          </Button>
        ) : (
          <Button variant="secondary" size="md" className="w-full" disabled>
            Unavailable
          </Button>
        )}
      </div>

      <div className="mt-6">
        <PricingBrandFeatureList
          items={features}
          variant={highlighted ? "dark" : "light"}
        />
      </div>
    </article>
  );
}
