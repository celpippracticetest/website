"use client";

import { useEffect, useMemo, useState } from "react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { getSectionSavingsBadge } from "@/components/pages/pricing/PricingPlanCheckoutTile";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  buildMonthlySavingsMap,
  buildOriginalPriceFromWeeklyMap,
  formatPlanCadPrice,
  formatPlanCadPriceWhole,
  parsePrice,
} from "@/lib/pricing";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
import { cn } from "@/lib/utils";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useEcommerceTracking } from "@/hooks/useTracking";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";

function getPlanDisplayTitle(section: PricingPlanSection) {
  if (section.key === "threeMonth") {
    return "Quarterly";
  }
  return section.title;
}

function formatOffLabel(percent: number) {
  if (!Number.isFinite(percent) || percent <= 0) {
    return null;
  }
  return `${Math.round(percent)}% OFF`;
}

function getDiscountLabelFromField(discount: string) {
  const value = Number.parseFloat(discount);
  return formatOffLabel(value);
}

function getDiscountLabelFromSavingsText(savingsText: string | null | undefined) {
  if (!savingsText) {
    return null;
  }
  const match = savingsText.match(/(\d+)\s*%/);
  if (!match) {
    return null;
  }
  return formatOffLabel(Number.parseInt(match[1], 10));
}

function getDiscountLabelFromPrices(price: string, oldPrice: string) {
  const current = parsePrice(price);
  const original = parsePrice(oldPrice);
  if (original <= current || original <= 0) {
    return null;
  }
  return formatOffLabel(((original - current) / original) * 100);
}

function resolvePlanDiscountLabel(
  plan: SerializedPlan,
  savingsText: string | null,
  computedOriginalPrice: string | undefined,
) {
  return (
    getDiscountLabelFromField(plan.discount) ??
    getDiscountLabelFromSavingsText(savingsText) ??
    getDiscountLabelFromPrices(plan.price, plan.oldPrice) ??
    (computedOriginalPrice
      ? getDiscountLabelFromPrices(plan.price, computedOriginalPrice)
      : null)
  );
}

function resolvePlanOldPrice(plan: SerializedPlan, computedOriginalPrice: string | undefined) {
  if (plan.oldPrice && parsePrice(plan.oldPrice) > parsePrice(plan.price)) {
    return plan.oldPrice;
  }
  if (computedOriginalPrice && parsePrice(computedOriginalPrice) > parsePrice(plan.price)) {
    return computedOriginalPrice;
  }
  return null;
}

type PricingModalPlanListProps = {
  plans: SerializedPlan[];
  sections: PricingPlanSection[];
  pricingCheckoutFields?: Record<string, string>;
  recommendedPlanId?: string | null;
  recommendedSectionKey?: DurationGroupKey | null;
};

export function PricingModalPlanList({
  plans,
  sections,
  pricingCheckoutFields,
  recommendedPlanId = null,
  recommendedSectionKey = null,
}: PricingModalPlanListProps) {
  const { user, isSignedIn, isLoaded } = useHybridWebUser();
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const attribution = useCheckoutAttributionPayload();
  const monthlySavingsById = useMemo(() => buildMonthlySavingsMap(plans), [plans]);
  const originalPriceById = useMemo(() => buildOriginalPriceFromWeeklyMap(plans), [plans]);
  const [selectedSectionKey, setSelectedSectionKey] = useState<DurationGroupKey | null>(
    recommendedSectionKey,
  );

  useEffect(() => {
    if (recommendedSectionKey) {
      setSelectedSectionKey(recommendedSectionKey);
    }
  }, [recommendedSectionKey]);

  const checkoutBase = !isLoaded
    ? ""
    : isSignedIn
      ? "/api/checkout_session"
      : "/api/checkout_session/guest";

  const handleCheckout = (section: PricingPlanSection) => {
    const item = section.plus;
    if (!item?.plan.stripePriceId || !checkoutBase) {
      return;
    }

    const p = item.plan;
    const stripePriceId = p.stripePriceId as string;
    const checkoutAction = `${checkoutBase}?price=${encodeURIComponent(stripePriceId)}`;
    const normalizedPrice = parsePrice(p.price);
    const trackingItem = {
      item_id: p.planTitle,
      item_name: p.title,
      price: normalizedPrice,
      quantity: 1,
      item_brand: "CELPIP Practice Test",
      item_category: "Subscription",
    };

    selectItem([trackingItem], "plans_page", "Pricing Plans");
    beginCheckout([trackingItem], "CAD", normalizedPrice, undefined, {
      email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user?.firstName || "",
        last_name: user?.lastName || "",
      },
    });

    const form = document.createElement("form");
    form.method = "POST";
    form.action = checkoutAction;
    const add = (name: string, value: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };
    for (const [key, value] of Object.entries(mergePendingGa4IntoAttribution(attribution))) {
      add(key, value);
    }
    if (pricingCheckoutFields) {
      for (const [name, value] of Object.entries(pricingCheckoutFields)) {
        if (value) add(name, value);
      }
    }
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div
      className="flex w-full flex-col gap-2.5 lg:gap-3"
      role="radiogroup"
      aria-label="Choose billing period"
    >
      {sections.map((section) => {
        const item = section.plus;
        if (!item?.plan.stripePriceId) {
          return null;
        }

        const p = item.plan;
        const isRecommended =
          Boolean(recommendedPlanId) &&
          recommendedSectionKey === section.key &&
          item.stableId === recommendedPlanId;
        const isSelected = selectedSectionKey === section.key;
        const isPopular = section.key === "threeMonth";
        const savingsText = getSectionSavingsBadge(
          { key: section.key, plus: item },
          monthlySavingsById,
        );
        const computedOriginalPrice = originalPriceById.get(item.stableId);
        const discountLabel = resolvePlanDiscountLabel(
          p,
          savingsText,
          computedOriginalPrice,
        );
        const displayOldPrice = resolvePlanOldPrice(p, computedOriginalPrice);
        const displayTitle = getPlanDisplayTitle(section);
        const disabled = !checkoutBase;

        return (
          <button
            key={section.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            id={isRecommended ? "recommended-plan" : undefined}
            disabled={disabled}
            onClick={() => {
              setSelectedSectionKey(section.key);
              handleCheckout(section);
            }}
            aria-label={
              discountLabel
                ? `Upgrade to Plus, ${displayTitle}, ${discountLabel}`
                : `Upgrade to Plus, ${displayTitle}`
            }
            className={cn(
              "relative flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1 focus-visible:ring-offset-2",
              "hover:border-primary1/35 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
              isSelected &&
                "scroll-mt-24 border-2 border-primary1 bg-blue-50/50 shadow-md md:scroll-mt-28",
              isPopular &&
                !isSelected &&
                "border-[#8B5CF6]/50 ring-1 ring-[#8B5CF6]/20",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                isSelected ? "border-primary1 bg-primary1" : "border-slate-300 bg-white",
              )}
              aria-hidden
            >
              {isSelected ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
            </span>
            <span className="min-w-0 shrink-0 font-semibold text-slate-900">{displayTitle}</span>
            {discountLabel ? (
              <span className="pointer-events-none absolute left-1/2 top-1/2 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-md bg-error2 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                {discountLabel}
              </span>
            ) : null}
            <div className="ml-auto flex shrink-0 items-baseline justify-end gap-1.5 text-right">
              <span className="text-sm text-slate-500">CA$</span>
              <span className="text-lg font-bold tabular-nums text-slate-900">
                {formatPlanCadPrice(p.price)}
              </span>
              {displayOldPrice ? (
                <span className="text-sm tabular-nums text-slate-400 line-through">
                  {formatPlanCadPriceWhole(displayOldPrice)}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
