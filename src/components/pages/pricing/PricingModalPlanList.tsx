"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { getSectionSavingsBadge } from "@/components/pages/pricing/PricingPlanCheckoutTile";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  buildMonthlySavingsMap,
  buildOriginalPriceFromWeeklyMap,
  formatPlanCadPrice,
  formatPlanCadPriceWhole,
  getPlanWeeklyEquivalentPrice,
  getWeeklyCompareAtPrice,
  getWeeklyEquivalentDiscountPercent,
  parsePrice,
} from "@/lib/pricing";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
import { v2ButtonVariants } from "@/components/v2/Button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { usePricingModelAbVariant } from "@/hooks/usePricingModelAbVariant";
import { PricingModelAbExperimentTracker } from "@/components/analytics/PricingModelAbExperimentTracker";
import {
  getSignedCheckoutSessionBase,
  redirectToSignUpForCheckout,
} from "@/lib/checkoutRequireAuth";
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

function PlanListPriceAmount({
  amount,
  showWeekSuffix = false,
}: {
  amount: number;
  showWeekSuffix?: boolean;
}) {
  const formatted = formatPlanCadPrice(String(amount));
  const decimalSeparator = formatted.includes(".") ? "." : formatted.includes(",") ? "," : null;

  if (!decimalSeparator) {
    return (
      <span className="text-lg font-bold tabular-nums text-slate-900">
        {formatted}
        {showWeekSuffix ? (
          <span className="text-sm font-semibold text-slate-600">/week</span>
        ) : null}
      </span>
    );
  }

  const [whole, cents] = formatted.split(decimalSeparator);

  return (
    <span className="text-lg font-bold tabular-nums text-slate-900">
      {whole}
      <span className="text-[0.72em] font-bold leading-none">.</span>
      <sup className="relative -top-1 text-[0.55em] font-bold leading-none">{cents}</sup>
      {showWeekSuffix ? (
        <span className="text-sm font-semibold text-slate-600">/week</span>
      ) : null}
    </span>
  );
}

type PricingModalPlanListProps = {
  plans: SerializedPlan[];
  sections: PricingPlanSection[];
  pricingCheckoutFields?: Record<string, string>;
  recommendedPlanId?: string | null;
  recommendedSectionKey?: DurationGroupKey | null;
  trackExperimentView?: boolean;
};

export function PricingModalPlanList({
  plans,
  sections,
  pricingCheckoutFields,
  recommendedPlanId = null,
  recommendedSectionKey = null,
  trackExperimentView = true,
}: PricingModalPlanListProps) {
  const { user, isSignedIn, isLoaded } = useHybridWebUser();
  const { variant: pricingModelVariant, participatesInExperiment } = usePricingModelAbVariant();
  const showWeeklyEquivalent = pricingModelVariant === "weekly_equiv";
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const attribution = useCheckoutAttributionPayload();
  const monthlySavingsById = useMemo(() => buildMonthlySavingsMap(plans), [plans]);
  const originalPriceById = useMemo(() => buildOriginalPriceFromWeeklyMap(plans), [plans]);
  const weeklyCompareAt = useMemo(() => getWeeklyCompareAtPrice(plans), [plans]);
  const [selectedSectionKey, setSelectedSectionKey] = useState<DurationGroupKey | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | null>(null);
  const [appliedPromoDiscountLabel, setAppliedPromoDiscountLabel] = useState<string | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);

  useEffect(() => {
    setSelectedSectionKey((current) => {
      if (current !== null) {
        return current;
      }
      if (recommendedSectionKey) {
        return recommendedSectionKey;
      }
      if (sections.length === 0) {
        return null;
      }
      return (
        sections.find((section) => section.key === "threeMonth")?.key ?? sections[0]?.key ?? null
      );
    });
  }, [recommendedSectionKey, sections]);

  const checkoutBase = getSignedCheckoutSessionBase(isLoaded, isSignedIn);

  const validatePromoCode = useCallback(async (code: string) => {
    const response = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = (await response.json()) as {
      valid?: boolean;
      error?: string;
      discountLabel?: string;
    };
    if (!response.ok || !data.valid) {
      return { ok: false as const, error: data.error ?? "This promo code is not valid" };
    }
    return {
      ok: true as const,
      discountLabel: data.discountLabel ?? null,
    };
  }, []);

  const applyPromoCode = useCallback(async () => {
    const code = promoCodeInput.trim();
    if (!code) {
      setPromoError("Enter a promo code");
      setAppliedPromoCode(null);
      setAppliedPromoDiscountLabel(null);
      return;
    }
    setPromoValidating(true);
    setPromoError(null);
    try {
      const result = await validatePromoCode(code);
      if (!result.ok) {
        setPromoError(result.error);
        setAppliedPromoCode(null);
        setAppliedPromoDiscountLabel(null);
        return;
      }
      setAppliedPromoCode(code);
      setAppliedPromoDiscountLabel(result.discountLabel);
      setPromoError(null);
    } catch {
      setPromoError("Could not validate promo code");
      setAppliedPromoCode(null);
      setAppliedPromoDiscountLabel(null);
    } finally {
      setPromoValidating(false);
    }
  }, [promoCodeInput, validatePromoCode]);

  const handleCheckout = async (section: PricingPlanSection) => {
    const item = section.plus;
    if (!item?.plan.stripePriceId) {
      return;
    }
    if (!isLoaded) {
      return;
    }
    if (!isSignedIn) {
      redirectToSignUpForCheckout();
      return;
    }
    if (!checkoutBase) {
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
    if (participatesInExperiment) {
      add("pricing_ab_model", pricingModelVariant);
    }

    let promoToSubmit = appliedPromoCode;
    const typedPromo = promoCodeInput.trim();
    if (!promoToSubmit && typedPromo) {
      const result = await validatePromoCode(typedPromo);
      if (!result.ok) {
        setShowPromoInput(true);
        setPromoError(result.error);
        return;
      }
      promoToSubmit = typedPromo;
      if (result.discountLabel) {
        setAppliedPromoDiscountLabel(result.discountLabel);
      }
    }
    if (promoToSubmit) {
      add("promo_code", promoToSubmit);
    }

    document.body.appendChild(form);
    form.submit();
  };

  const selectedSection = sections.find((section) => section.key === selectedSectionKey);

  return (
    <div className="flex w-full flex-col">
    <PricingModelAbExperimentTracker
      participatesInExperiment={participatesInExperiment}
      variant={pricingModelVariant}
      enabled={trackExperimentView}
    />
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
        const displayOldPrice = resolvePlanOldPrice(p, computedOriginalPrice);
        const displayTitle = getPlanDisplayTitle(section);
        const displayPrice = showWeeklyEquivalent
          ? getPlanWeeklyEquivalentPrice(p)
          : parsePrice(p.price);
        const discountLabel = showWeeklyEquivalent
          ? formatOffLabel(
              getWeeklyEquivalentDiscountPercent(displayPrice, weeklyCompareAt) ?? 0,
            )
          : resolvePlanDiscountLabel(p, savingsText, computedOriginalPrice);
        const strikethroughOldPrice = showWeeklyEquivalent
          ? weeklyCompareAt > displayPrice
            ? weeklyCompareAt
            : null
          : displayOldPrice
            ? parsePrice(displayOldPrice)
            : null;
        const showStrikethrough =
          strikethroughOldPrice != null && strikethroughOldPrice > displayPrice;

        return (
          <button
            key={section.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            id={isRecommended ? "recommended-plan" : undefined}
            onClick={() => setSelectedSectionKey(section.key)}
            aria-label={
              discountLabel
                ? `${displayTitle}, ${discountLabel}`
                : displayTitle
            }
            className={cn(
              "relative flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left shadow-sm transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1 focus-visible:ring-offset-2",
              "hover:border-primary1/35 hover:shadow-md",
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
            <div className="ml-auto flex shrink-0 flex-col items-end text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-sm text-slate-500">CA$</span>
                {showWeeklyEquivalent ? (
                  <PlanListPriceAmount amount={displayPrice} showWeekSuffix />
                ) : (
                  <span className="text-lg font-bold tabular-nums text-slate-900">
                    {formatPlanCadPrice(String(displayPrice))}
                  </span>
                )}
                {showStrikethrough ? (
                  <span className="text-sm tabular-nums text-slate-400 line-through">
                    {formatPlanCadPriceWhole(String(strikethroughOldPrice))}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
    <div className="mt-4 flex w-full flex-col gap-2">
      {!showPromoInput ? (
        <button
          type="button"
          onClick={() => setShowPromoInput(true)}
          className="self-start text-sm font-semibold text-primary1 underline-offset-2 hover:underline"
        >
          Promo code
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={promoCodeInput}
              onChange={(event) => {
                setPromoCodeInput(event.target.value);
                setPromoError(null);
                if (appliedPromoCode && event.target.value.trim() !== appliedPromoCode) {
                  setAppliedPromoCode(null);
                  setAppliedPromoDiscountLabel(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void applyPromoCode();
                }
              }}
              placeholder="Enter promo code"
              aria-label="Promo code"
              autoComplete="off"
              className="h-11 flex-1 rounded-xl border-slate-200 bg-white text-base"
            />
            <button
              type="button"
              disabled={promoValidating || !promoCodeInput.trim()}
              onClick={() => void applyPromoCode()}
              className={cn(
                v2ButtonVariants({ variant: "outlinePrimary", size: "sm" }),
                "h-11 shrink-0 px-4 text-sm font-semibold",
              )}
            >
              {promoValidating ? "..." : "Apply"}
            </button>
          </div>
          {promoError ? (
            <p className="text-sm text-error1" role="alert">
              {promoError}
            </p>
          ) : null}
          {appliedPromoCode ? (
            <p className="text-sm font-medium text-success">
              Promo code &ldquo;{appliedPromoCode}&rdquo; applied
              {appliedPromoDiscountLabel ? (
                <span className="font-semibold"> — {appliedPromoDiscountLabel}</span>
              ) : null}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setShowPromoInput(false);
              setPromoError(null);
            }}
            className="self-start text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Hide promo code
          </button>
        </div>
      )}
    </div>
    <button
      type="button"
      disabled={!selectedSection || promoValidating || !isLoaded}
      onClick={() => {
        if (selectedSection) {
          void handleCheckout(selectedSection);
        }
      }}
      className={cn(
        v2ButtonVariants({ variant: "primary", size: "md" }),
        "mt-3 h-12 w-full shrink-0 text-sm font-bold",
      )}
    >
      Upgrade to Pro
    </button>
    <p className="mt-2 text-center text-xs text-slate-500">Cancel anytime</p>
    </div>
  );
}
