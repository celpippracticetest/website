"use client";

import AutoAwesome from "@mui/icons-material/AutoAwesome";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  formatBillingCycle,
  formatPlanCadPrice,
  parsePrice,
} from "@/lib/pricing";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
import { v2ButtonVariants } from "@/components/v2/Button";
import { cn } from "@/lib/utils";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import {
  getSignedCheckoutSessionBase,
  redirectToSignUpForCheckout,
} from "@/lib/checkoutRequireAuth";
import { useEcommerceTracking } from "@/hooks/useTracking";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";

function approxDaysForDurationKey(key: DurationGroupKey): number {
  switch (key) {
    case "weekly":
      return 7;
    case "monthly":
      return 30;
    case "threeMonth":
      return 90;
    case "yearly":
      return 365;
    default:
      return 30;
  }
}

function perDayCadLabel(plan: SerializedPlan, durationKey: DurationGroupKey): string {
  const total = parsePrice(plan.price);
  const days = approxDaysForDurationKey(durationKey);
  if (!Number.isFinite(total) || days <= 0) return "—";
  return (total / days).toFixed(2);
}

export function getSectionSavingsBadge(
  section: {
    key: DurationGroupKey;
    plus: { stableId: string } | null;
  },
  monthlySavingsById: Map<string, string>
) {
  const savingsCandidates = [section.plus]
    .filter(Boolean)
    .map((item) => {
      const savingsText = monthlySavingsById.get(item!.stableId);

      if (!savingsText) {
        return null;
      }

      const numericMatch = savingsText.match(/(\d+)/);
      const numericValue = numericMatch ? Number.parseInt(numericMatch[1], 10) : 0;

      return {
        label: savingsText,
        score: numericValue,
      };
    })
    .filter(Boolean) as Array<{ label: string; score: number }>;

  if (savingsCandidates.length === 0) {
    return null;
  }

  return savingsCandidates.sort((left, right) => right.score - left.score)[0].label;
}

export type PricingPlanCheckoutTileProps = {
  section: PricingPlanSection;
  pricingCheckoutFields?: Record<string, string>;
  monthlySavingsById: Map<string, string>;
  recommendedPlanId: string | null;
  recommendedSectionKey: DurationGroupKey | null | undefined;
  compact?: boolean;
};

export function PricingPlanCheckoutTile({
  section,
  pricingCheckoutFields,
  monthlySavingsById,
  recommendedPlanId,
  recommendedSectionKey,
  compact = false,
}: PricingPlanCheckoutTileProps) {
  const item = section.plus;
  const { user, isSignedIn, isLoaded } = useHybridWebUser();
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const attribution = useCheckoutAttributionPayload();

  if (!item?.plan.stripePriceId) {
    const isUnavailableRecommended =
      Boolean(item?.stableId && recommendedPlanId) &&
      recommendedSectionKey === section.key &&
      item?.stableId === recommendedPlanId;

    return (
      <div
        id={isUnavailableRecommended ? "recommended-plan" : undefined}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
      >
        {section.title} — Unavailable
      </div>
    );
  }

  const p = item.plan;
  const stripePriceId = p.stripePriceId as string;
  const isRecommended =
    Boolean(recommendedPlanId) &&
    recommendedSectionKey === section.key &&
    item.stableId === recommendedPlanId;
  const checkoutBase = getSignedCheckoutSessionBase(isLoaded, isSignedIn);
  const checkoutAction =
    checkoutBase && typeof checkoutBase === "string"
      ? `${checkoutBase}?price=${encodeURIComponent(stripePriceId)}`
      : "";
  const normalizedPrice = parsePrice(p.price);
  const trackingItem = {
    item_id: p.planTitle,
    item_name: p.title,
    price: normalizedPrice,
    quantity: 1,
    item_brand: "CELPIP Practice Test",
    item_category: "Subscription",
  };

  const trackCheckoutIntent = () => {
    selectItem([trackingItem], "plans_page", "Pricing Plans");
    beginCheckout([trackingItem], "CAD", normalizedPrice, undefined, {
      email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user?.firstName || "",
        last_name: user?.lastName || "",
      },
    });
  };

  const submitStripeCheckout = () => {
    if (!checkoutAction) return;
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

  const onCheckout = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      redirectToSignUpForCheckout();
      return;
    }
    trackCheckoutIntent();
    submitStripeCheckout();
  };

  const savingsBadge = getSectionSavingsBadge(
    { key: section.key, plus: item },
    monthlySavingsById
  );

  const emphasisThreeMonth = section.key === "threeMonth";
  const perDay = perDayCadLabel(p, section.key);
  const cycle = formatBillingCycle(p.billingInterval, p.billingIntervalCount);
  const isPopular = emphasisThreeMonth;

  return (
    <button
      type="button"
      id={isRecommended ? "recommended-plan" : undefined}
      onClick={onCheckout}
      disabled={!isLoaded}
      aria-label={`Upgrade to Plus, ${section.title}`}
      className={cn(
        "relative flex h-full w-full min-w-0 flex-col rounded-2xl border bg-white p-6 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        compact ? "min-h-[280px] p-5" : "min-h-[320px]",
        isRecommended && "scroll-mt-24 md:scroll-mt-28",
        isPopular
          ? "z-[2] border-2 border-[#8B5CF6] shadow-[0_20px_60px_rgba(139,92,246,0.15)] md:scale-[1.02] md:hover:scale-[1.03]"
          : "border-slate-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg",
      )}
    >
      {isPopular ? (
        <span className="pointer-events-none absolute -top-3 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#8B5CF6] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-md">
          <AutoAwesome sx={{ fontSize: 14 }} aria-hidden />
          Most popular
        </span>
      ) : null}
      {savingsBadge ? (
        <span
          className={cn(
            "pointer-events-none absolute right-3 top-3 z-[4] max-w-[11rem] truncate rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-800 shadow-sm ring-2 ring-white",
          )}
          title={savingsBadge}
        >
          {savingsBadge}
        </span>
      ) : null}

      <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
      <p className="text-sm text-slate-500">{section.eyebrow}</p>

      <div className="mt-5 flex flex-wrap items-baseline gap-1">
        <span className="text-sm font-normal text-slate-500">CA$</span>
        <span className="text-3xl font-extrabold leading-none text-[#1B2B5A]">
          {formatPlanCadPrice(p.price)}
        </span>
      </div>
      {cycle ? (
        <p className="mt-1 text-sm text-slate-500">per {cycle}</p>
      ) : null}

      <span className="mt-3 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
        {perDay === "—" ? "Per-day estimate unavailable" : `Only CA$${perDay}/day`}
      </span>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{section.summary}</p>

      <span
        className={cn(
          v2ButtonVariants({
            variant: isPopular ? "secondary" : "primary",
            size: "md",
          }),
          "pointer-events-none mt-6 h-12 w-full shrink-0 text-sm font-bold",
        )}
      >
        {isPopular ? "Get Best Value" : "Upgrade to Plus"}
      </span>
    </button>
  );
}
