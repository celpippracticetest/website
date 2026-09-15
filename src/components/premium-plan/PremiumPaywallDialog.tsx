"use client";

import { useCallback, useMemo } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { submitPlanCheckout } from "@/lib/planCheckout";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import {
  getPlanPriceDisplay,
  type FeaturedPlanName,
} from "@/lib/brandPlanPricing";
import { groupPlansByDuration } from "@/lib/pricingPlanSections";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";
import { cn } from "@/lib/utils";

const SHARED_FEATURES = [
  "Unlimited access to 3,000+ practices",
  "60 full mock exams",
  "Instant AI feedback for all skills",
] as const;

function findSectionPlan(
  grouped: ReturnType<typeof groupPlansByDuration>,
  key: DurationGroupKey,
) {
  return grouped.find((section) => section.key === key)?.plus?.plan ?? null;
}

function titleCaseSaveLabel(label: string | null): string | null {
  if (!label) return null;
  return label.replace(/^SAVE\s+/i, "Save ");
}

type PaywallPlanCardProps = {
  name: FeaturedPlanName;
  price: string;
  priceSuffix: string;
  perWeekEquivalent: string;
  saveLabel: string | null;
  plan: SerializedPlan | null;
  highlighted: boolean;
};

function PaywallPlanCard({
  name,
  price,
  priceSuffix,
  perWeekEquivalent,
  saveLabel,
  plan,
  highlighted,
}: PaywallPlanCardProps) {
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
      attributionFields: attribution,
      currency: plan.currency,
      isLoaded,
      isSignedIn,
    });
  }, [attribution, isLoaded, isSignedIn, name, plan]);

  return (
    <article
      className={cn(
        "relative flex min-h-[220px] flex-1 flex-col rounded-[20px] px-5 pb-5 pt-6",
        highlighted
          ? "border-2 border-[#4d7ef7] bg-[#f3f7ff] shadow-[0_12px_28px_rgba(77,126,247,0.16)]"
          : "border border-[#eceff5] bg-white",
      )}
    >
      {highlighted ? (
        <span className="absolute -top-[13px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#4d7ef7] px-3.5 py-[5px] text-[12px] font-bold text-white">
          Most Popular
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="text-[15px] font-semibold text-[#5b6575]">{name}</span>
        {saveLabel ? (
          <span className="text-[13px] font-semibold text-[#2e9e5b]">
            {saveLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[32px] font-extrabold tracking-[-0.03em] text-[#111827]">
          {price}
        </span>
        <span className="text-[14px] font-medium text-[#98a2b3]">
          {priceSuffix}
        </span>
      </div>

      <div className="mt-0.5 min-h-4 text-[12px] text-[#98a2b3]">
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
          "mt-5 w-full cursor-pointer rounded-full px-0 py-[11px] text-[14px] font-semibold transition-[transform,background,border-color] duration-150 ease-out enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
          highlighted
            ? "border-0 bg-[#4d7ef7] text-white shadow-[0_6px_14px_rgba(77,126,247,0.28)] enabled:hover:bg-[#3d6fe8]"
            : "border border-[#dbe3f0] bg-white text-[#1a2233] enabled:hover:border-[#4d7ef7] enabled:hover:text-[#4d7ef7]",
        )}
      >
        {highlighted ? "Get Premium" : "Choose"}
      </button>
    </article>
  );
}

type PremiumPaywallDialogProps = {
  plans: SerializedPlan[];
  isLoading: boolean;
  onClose: () => void;
};

export function PremiumPaywallDialog({
  plans,
  isLoading,
  onClose,
}: PremiumPaywallDialogProps) {
  const grouped = useMemo(() => groupPlansByDuration(plans), [plans]);
  const weeklyPlan = findSectionPlan(grouped, "weekly");
  const monthlyPlan = findSectionPlan(grouped, "monthly");
  const quarterlyPlan = findSectionPlan(grouped, "threeMonth");

  const weeklyDisplay = getPlanPriceDisplay(weeklyPlan, "weekly", {
    showPerWeek: true,
  });
  const monthlyDisplay = getPlanPriceDisplay(monthlyPlan, "monthly", {
    weeklyPlan,
    showPerWeek: true,
  });
  const quarterlyDisplay = getPlanPriceDisplay(quarterlyPlan, "quarterly", {
    weeklyPlan,
    showPerWeek: true,
  });

  const cards = [
    {
      name: "Weekly" as const,
      plan: weeklyPlan,
      display: weeklyDisplay,
    },
    {
      name: "Monthly" as const,
      plan: monthlyPlan,
      display: monthlyDisplay,
    },
    {
      name: "Quarterly" as const,
      plan: quarterlyPlan,
      display: quarterlyDisplay,
    },
  ];

  return (
    <div className="relative w-full max-w-[880px] rounded-[28px] bg-white px-6 pb-6 pt-7 shadow-[0_24px_80px_rgba(26,34,51,0.22)] screen744:px-9 screen744:pb-7 screen744:pt-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f5f9] text-[#5b6575] transition-colors hover:bg-[#e8ecf3]"
        aria-label="Close pricing"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-5 screen744:flex-row screen744:items-start screen744:gap-5">
        <Image
          src="/images/beaver-head-logo.png"
          alt=""
          width={72}
          height={72}
          className="h-[64px] w-[64px] shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1 pr-8">
          <span className="inline-flex rounded-full bg-[#fff1e8] px-3 py-1 text-[12px] font-semibold text-[#e07a45]">
            Upgrade to Premium
          </span>
          <h2 className="mt-2.5 m-0 text-[26px] font-bold leading-tight tracking-[-0.03em] text-[#1a2233] screen744:text-[30px]">
            Save up to 60% on Quarterly
          </h2>
          <p className="mt-2 mb-0 max-w-[520px] text-[14px] leading-[1.45] text-[#8b93a3]">
            Take a full CELPIP exam and get instant AI scoring on your writing
            and speaking.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-[#5b6575]">Loading plans…</p>
      ) : plans.length === 0 ? (
        <p className="mt-8 text-sm text-[#5b6575]">
          Plans are unavailable right now. Please try again later.
        </p>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-1 gap-4 screen744:grid-cols-3 screen744:items-stretch">
            {cards.map(({ name, plan, display }) => (
              <PaywallPlanCard
                key={name}
                name={name}
                price={display.price}
                priceSuffix={display.priceSuffix}
                perWeekEquivalent={display.perWeekEquivalent}
                saveLabel={titleCaseSaveLabel(display.saveLabel)}
                plan={plan}
                highlighted={name === "Monthly"}
              />
            ))}
          </div>

          <ul className="mt-6 flex flex-col gap-2 screen744:flex-row screen744:flex-wrap screen744:items-center screen744:justify-center screen744:gap-x-7 screen744:gap-y-2">
            {SHARED_FEATURES.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[13px] font-medium text-[#3a4356]"
              >
                <span
                  className="text-[13px] font-bold text-[#2e9e5b]"
                  aria-hidden
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 flex flex-col gap-3 border-t border-[#eef1f6] pt-4 screen744:flex-row screen744:items-center screen744:justify-between">
        <p className="m-0 flex items-center gap-2 text-[13px] text-[#8b93a3]">
          <span className="font-bold text-[#2e9e5b]" aria-hidden>
            ✓
          </span>
          48-hour money-back guarantee · Cancel anytime
        </p>
        <button
          type="button"
          onClick={onClose}
          className="self-end text-[13px] font-medium text-[#8b93a3] underline-offset-2 transition-colors hover:text-[#1a2233] hover:underline"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
