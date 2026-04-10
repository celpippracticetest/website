"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Check from "@mui/icons-material/Check";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import ChevronUp from "@mui/icons-material/KeyboardArrowUp";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Star from "@mui/icons-material/Star";
import SvgDiamond from "@/components/icons/Diamond";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  comparisonRows,
  pricingFaqs,
  pricingHeroStats,
  pricingTestimonials,
} from "@/components/pages/pricing/pricingContent";
import { Box } from "@/components/ui/Box";
import { useEcommerceTracking, useEngagementTracking } from "@/hooks/useTracking";
import { useUserContext } from "@/hooks/useUserContext";
import { durationDisplayOrder, durationMeta } from "@/lib/pricingCatalog";
import {
  buildFreeWeeksLabelFromWeeklyMap,
  buildOriginalPriceFromWeeklyMap,
  buildMonthlySavingsMap,
  formatBillingCycle,
  formatPlanCadPrice,
  getAccessLabel,
  getDurationGroupKey,
  getFooterNote,
  getPlanDescription,
  getStablePlanId,
  isPremiumPlusPlan,
  parsePrice,
  PRICING_TIER_COMPARISON_ROWS,
} from "@/lib/pricing";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import type { DurationGroupKey, PricingFaq, SerializedPlan } from "@/types/pricing";
import { PayPalSubscribeButton } from "@/components/paypal/PayPalSubscribeButton";
const avatarSources = ["Carlos.png", "Li.png", "Tatiana.png"];

/** Public paths for checkout CTAs (aligned with final-offer payment modal). */
const CHECKOUT_STRIPE_WORDMARK_WHITE_SRC =
  "/icons/stripe/Stripe%20wordmark%20-%20White%20-%20Small.png";
const CHECKOUT_PAYPAL_MONOGRAM_SRC = "/icons/paypal/PayPal-Monogram-FullColor-RGB.png";

const PRICING_TABLE_GOOGLE_PAY_SRC = "/icons/payments/googlepay.svg";
const PRICING_TABLE_APPLE_PAY_SRC = "/icons/payments/applepay.svg";
const PRICING_TABLE_STRIPE_WORDMARK_SLATE_SRC =
  "/icons/stripe/Stripe%20wordmark%20-%20Slate.svg";

type PersonalizedRecommendation = {
  planType: DurationGroupKey;
  headline: string;
  summary: string;
  reasons: string[];
};

type GroupedPlanItem = {
  plan: SerializedPlan;
  index: number;
  stableId: string;
};

function PricingSubscribePaymentMarks() {
  const markH = 14;
  return (
    <div className="mt-1.5 flex max-w-[180px] flex-wrap items-center gap-x-1.5 gap-y-1">
      <img
        src={PRICING_TABLE_GOOGLE_PAY_SRC}
        alt="Google Pay"
        width={36}
        height={markH}
        className="h-3.5 w-auto max-h-3.5 max-w-[36px] shrink-0 object-contain object-left"
        style={{ width: "auto", height: markH }}
      />
      <img
        src={PRICING_TABLE_APPLE_PAY_SRC}
        alt="Apple Pay"
        width={30}
        height={markH}
        className="h-3.5 w-auto max-h-3.5 max-w-[30px] shrink-0 object-contain object-left"
        style={{ width: "auto", height: markH }}
      />
      <img
        src={CHECKOUT_PAYPAL_MONOGRAM_SRC}
        alt="PayPal"
        width={markH}
        height={markH}
        className="h-3.5 w-3.5 max-h-3.5 max-w-3.5 shrink-0 object-contain object-left"
      />
      <img
        src={PRICING_TABLE_STRIPE_WORDMARK_SLATE_SRC}
        alt="Stripe"
        width={52}
        height={markH}
        className="h-3.5 w-auto max-h-3.5 max-w-[52px] shrink-0 object-contain object-left"
        style={{ width: "auto", height: markH }}
      />
    </div>
  );
}

function PricingStyleOneSubscribeForm({
  item,
  pricingCheckoutFields,
  pricingAbLayout,
  anchorId,
}: {
  item: GroupedPlanItem | null;
  pricingCheckoutFields?: Record<string, string>;
  pricingAbLayout?: PricingAbLayout;
  anchorId?: string;
}) {
  const { user, isSignedIn, isLoaded } = useUser();
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const attribution = useCheckoutAttributionPayload();
  const [modalOpen, setModalOpen] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  if (!item?.plan.stripePriceId) {
    return <span className="text-sm text-slate-400">Unavailable</span>;
  }

  const p = item.plan;
  const stripePriceId = p.stripePriceId;
  if (!stripePriceId) {
    return <span className="text-sm text-slate-400">Unavailable</span>;
  }
  const checkoutBase = !isLoaded
    ? ""
    : isSignedIn
      ? "/api/checkout_session"
      : "/api/checkout_session/guest";
  const checkoutAction = checkoutBase
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
    for (const [key, value] of Object.entries(attribution)) {
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

  const openModal = () => {
    trackCheckoutIntent();
    setPaypalError(null);
    setModalOpen(true);
  };

  const subscribeTriggerClass =
    "flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-[#635BFF] px-4 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#5851DF] focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-blue-950">
              {isSignedIn ? "Choose payment method" : "Continue to checkout"}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {isSignedIn
                ? "Secure checkout, powered by Stripe and PayPal."
                : "Secure checkout, powered by Stripe."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                submitStripeCheckout();
              }}
              aria-label={isSignedIn ? "Pay with Stripe" : "Continue with Stripe"}
              className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#635BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#5851DF] focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:ring-offset-2"
            >
              <span>{isSignedIn ? "Pay with" : "Continue with"}</span>
              <Image
                src={CHECKOUT_STRIPE_WORDMARK_WHITE_SRC}
                alt=""
                width={56}
                height={20}
                className="h-5 w-auto shrink-0 object-contain object-center"
              />
            </button>
            {isSignedIn ? (
              <PayPalSubscribeButton
                aria-label="Pay with PayPal"
                busy={paypalLoading}
                onBusyChange={setPaypalLoading}
                onError={setPaypalError}
                onBegin={() => setPaypalError(null)}
                buildSubscriptionBody={() => ({
                  stripePriceId,
                  attribution,
                  pricingAbLayout: pricingAbLayout ?? undefined,
                })}
                className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-[#2C2E2F] bg-[#FFC439] px-4 py-2.5 text-sm font-bold tracking-tight text-[#003087] shadow-sm outline-none transition hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-[#003087] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Image
                  src={CHECKOUT_PAYPAL_MONOGRAM_SRC}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain object-center"
                />
                {paypalLoading ? "Redirecting to PayPal…" : "Pay with PayPal"}
              </PayPalSubscribeButton>
            ) : null}
            {paypalError ? (
              <p className="text-center text-sm text-red-600" role="alert">
                {paypalError}
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <div className="mx-auto w-full max-w-[220px]">
        <button
          type="button"
          id={anchorId}
          onClick={openModal}
          disabled={!checkoutAction}
          className={subscribeTriggerClass}
        >
          Subscribe
        </button>
      </div>
    </>
  );
}

function pricingStyleOnePriceCell(
  item: GroupedPlanItem | null | undefined,
  originalPriceFromWeeklyById: Map<string, string>,
  freeWeeksLabelById: Map<string, string>
) {
  if (!item?.plan) {
    return <span className="text-slate-400">—</span>;
  }
  const plan = item.plan;
  const cycle = formatBillingCycle(plan.billingInterval, plan.billingIntervalCount);
  const weeklyDerivedOldPrice = originalPriceFromWeeklyById.get(item.stableId);
  const freeWeeksLabel = freeWeeksLabelById.get(item.stableId);
  const oldP = weeklyDerivedOldPrice || (plan.oldPrice && Number.parseFloat(plan.oldPrice) > 0);
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {oldP && (
        <div className="inline-flex max-w-full shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-rose-700 sm:gap-1 sm:px-2 sm:text-[10px] sm:tracking-[0.06em]">
          <span>Was</span>
          <span className="relative text-[9px] font-semibold tabular-nums text-slate-500 sm:text-xs">
            CA$ {formatPlanCadPrice(String(oldP))}
            <span
              className="pointer-events-none absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rounded-full bg-rose-500/90"
              aria-hidden
            />
          </span>
        </div>
      )}
      <span className="text-lg font-bold text-blue-950">
        CA$ {formatPlanCadPrice(plan.price)}
      </span>
      {freeWeeksLabel ? (
        <span className="text-[10px] font-medium text-emerald-700">{freeWeeksLabel}</span>
      ) : null}
      {cycle ? (
        <span className="text-[11px] font-medium text-slate-500">per {cycle}</span>
      ) : null}
    </div>
  );
}

function PricingStyleOnePlanTable({
  section,
  pricingCheckoutFields,
  pricingAbLayout,
  recommendedPlanId,
  recommendedSectionKey,
  originalPriceFromWeeklyById,
  freeWeeksLabelById,
}: {
  section: {
    key: DurationGroupKey;
    premium: GroupedPlanItem | null;
    premiumPlus: GroupedPlanItem | null;
  };
  pricingCheckoutFields?: Record<string, string>;
  pricingAbLayout?: PricingAbLayout;
  recommendedPlanId: string | null;
  recommendedSectionKey: DurationGroupKey | null | undefined;
  originalPriceFromWeeklyById: Map<string, string>;
  freeWeeksLabelById: Map<string, string>;
}) {
  const prem = section.premium;
  const plus = section.premiumPlus;

  const recommendedAnchor = (item: GroupedPlanItem | null) =>
    item &&
    recommendedPlanId &&
    item.stableId === recommendedPlanId &&
    section.key === recommendedSectionKey
      ? "recommended-plan"
      : undefined;

  return (
    <Box className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[300px] border-collapse text-left text-[11px] leading-snug sm:text-[12px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th
              scope="col"
              className="px-2 py-2.5 font-semibold text-slate-700 sm:px-3"
            >
              Feature
            </th>
            <th
              scope="col"
              className="w-[26%] px-1 py-2.5 text-center font-semibold text-slate-700 sm:px-3"
            >
              Premium
            </th>
            <th
              scope="col"
              className="w-[26%] px-1 py-2.5 text-center font-semibold text-slate-700 sm:px-3"
            >
              Premium Plus
            </th>
          </tr>
        </thead>
        <tbody>
          {PRICING_TIER_COMPARISON_ROWS.map((row) => (
            <tr
              key={row.label}
              className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60"
            >
              <td
                className={`px-2 py-1.5 sm:px-3 sm:py-2 ${
                  row.labelEmphasis ? "font-semibold text-slate-900" : "text-slate-700"
                }`}
              >
                {row.label}
              </td>
              <td className="px-1 py-1.5 text-center sm:px-3 sm:py-2">
                {row.premium ? (
                  <Check
                    className="mx-auto size-3.5 text-emerald-600 sm:size-4"
                    strokeWidth={2.5}
                    aria-label="Included in Premium"
                  />
                ) : (
                  <span className="text-slate-300" aria-hidden>
                    —
                  </span>
                )}
              </td>
              <td className="px-1 py-1.5 text-center sm:px-3 sm:py-2">
                {row.premiumPlus ? (
                  <Check
                    className="mx-auto size-3.5 text-emerald-600 sm:size-4"
                    strokeWidth={2.5}
                    aria-label="Included in Premium Plus"
                  />
                ) : (
                  <span className="text-slate-300" aria-hidden>
                    —
                  </span>
                )}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200 bg-slate-50/90">
            <td className="px-2 py-2.5 font-semibold text-slate-800 sm:px-3">Price</td>
            <td className="px-1 py-2 text-center sm:px-3">
              {pricingStyleOnePriceCell(prem, originalPriceFromWeeklyById, freeWeeksLabelById)}
            </td>
            <td className="px-1 py-2 text-center sm:px-3">
              {pricingStyleOnePriceCell(plus, originalPriceFromWeeklyById, freeWeeksLabelById)}
            </td>
          </tr>
          <tr className="border-t border-slate-100 bg-white">
            <td className="px-2 py-3 align-top text-slate-800 sm:px-3">
              <span className="font-semibold">Subscribe</span>
              <p className="sr-only">
                Secure checkout with Google Pay, Apple Pay, PayPal, and Stripe.
              </p>
              <PricingSubscribePaymentMarks />
            </td>
            <td className="px-1 py-3 text-center align-top sm:px-3">
              <PricingStyleOneSubscribeForm
                item={prem}
                pricingCheckoutFields={pricingCheckoutFields}
                pricingAbLayout={pricingAbLayout}
                anchorId={recommendedAnchor(prem)}
              />
            </td>
            <td className="px-1 py-3 text-center align-top sm:px-3">
              <PricingStyleOneSubscribeForm
                item={plus}
                pricingCheckoutFields={pricingCheckoutFields}
                pricingAbLayout={pricingAbLayout}
                anchorId={recommendedAnchor(plus)}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );
}

function formatWeakAreasForSentence(weakAreas: string[]) {
  if (weakAreas.length === 0) return "";
  if (weakAreas.length === 1) return weakAreas[0];
  if (weakAreas.length === 2) return `${weakAreas[0]} and ${weakAreas[1]}`;
  return `${weakAreas.slice(0, -1).join(", ")}, and ${weakAreas[weakAreas.length - 1]}`;
}

function buildRecommendationExplanation(params: {
  testDate: string | null;
  focusSkill: string | null;
  weakAreas: string[];
  hasHighTarget: boolean;
}) {
  const explanationParts: string[] = [];

  if (params.testDate) {
    explanationParts.push(`your exam is ${params.testDate.toLowerCase()}`);
  }

  if (params.focusSkill && !/other/i.test(params.focusSkill)) {
    explanationParts.push(`your main focus is ${params.focusSkill}`);
  }

  if (params.weakAreas.length > 0) {
    explanationParts.push(
      `${formatWeakAreasForSentence(params.weakAreas)} ${
        params.weakAreas.length === 1 ? "is" : "are"
      } the area${params.weakAreas.length === 1 ? "" : "s"} you need to improve most`
    );
  }

  if (params.hasHighTarget) {
    explanationParts.push("you are aiming for a high target score");
  }

  if (explanationParts.length === 0) {
    return "";
  }

  if (explanationParts.length === 1) {
    return `This is recommended because ${explanationParts[0]}.`;
  }

  return `This is recommended because ${explanationParts
    .slice(0, -1)
    .join(", ")}, and ${explanationParts[explanationParts.length - 1]}.`;
}

function buildPersonalizedRecommendation(
  availableDurationKeys: DurationGroupKey[],
  userContext: ReturnType<typeof useUserContext>,
  isSignedIn: boolean
): PersonalizedRecommendation | null {
  if (!isSignedIn || availableDurationKeys.length === 0) {
    return null;
  }

  const testDate = userContext.onboardingProfile?.testDate || null;
  const focusSkill = userContext.onboardingProfile?.focusSkill || null;
  const weakAreas = userContext.weakAreas || [];
  const targetClb = Number.parseFloat(userContext.targetCLB || "");
  const targetScore = Number(userContext.onboardingProfile?.targetScore || 0);
  const hasHighTarget =
    (Number.isFinite(targetClb) && targetClb >= 9) ||
    (Number.isFinite(targetScore) && targetScore >= 9);
  const urgentExam = testDate === "In less than 2 weeks";
  const nearTermExam = testDate === "In 1 month";
  const longRunExam = testDate === "In 2+ months" || testDate === "I haven't booked it yet";
  const focusedSingleSkill =
    Boolean(focusSkill) &&
    !/exam strategy/i.test(focusSkill || "") &&
    weakAreas.length <= 1;
  const needsFullPrep =
    urgentExam ||
    nearTermExam ||
    weakAreas.length >= 2 ||
    /exam strategy/i.test(focusSkill || "") ||
    hasHighTarget;

  const reasons: string[] = [];
  if (testDate) reasons.push(`Exam timeline: ${testDate}`);
  if (focusSkill) reasons.push(`Primary focus: ${focusSkill}`);
  if (weakAreas.length > 0) reasons.push(`Weak areas: ${weakAreas.join(", ")}`);
  if (hasHighTarget) reasons.push("Target level is ambitious");

  const explanation = buildRecommendationExplanation({
    testDate,
    focusSkill,
    weakAreas,
    hasHighTarget,
  });

  if (urgentExam && focusedSingleSkill && !needsFullPrep && availableDurationKeys.includes("weekly")) {
    return {
      planType: "weekly",
      headline: "Recommended for your short timeline",
      summary:
        explanation ||
        "A short Premium sprint is the best fit when your exam is close and your prep is focused.",
      reasons,
    };
  }

  if (
    ((focusedSingleSkill && longRunExam && !needsFullPrep) ||
      (nearTermExam && focusedSingleSkill && !hasHighTarget)) &&
    availableDurationKeys.includes("monthly")
  ) {
    return {
      planType: "monthly",
      headline: "Recommended for focused improvement",
      summary:
        explanation ||
        "This option gives you enough guided practice time without overcommitting to a longer plan.",
      reasons,
    };
  }

  if (availableDurationKeys.includes("threeMonth")) {
    return {
      planType: "threeMonth",
      headline: "Recommended for your goal and timeline",
      summary:
        explanation ||
        "This option gives you the best balance of time, depth, and mock exam support.",
      reasons,
    };
  }

  return {
    planType: availableDurationKeys[0],
    headline: "Recommended for your current prep stage",
    summary:
      explanation || "This plan best matches your current timeline and study needs.",
    reasons,
  };
}

function FAQItem({ question, answer }: PricingFaq) {
  const [isOpen, setIsOpen] = useState(false);
  const { faqClick } = useEngagementTracking();

  const handleToggle = () => {
    if (!isOpen) {
      faqClick(question, "pricing_page");
    }

    setIsOpen((current) => !current);
  };

  return (
    <Box className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left md:px-5"
      >
        <span className="text-sm font-semibold text-slate-900 md:text-base">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
        )}
      </button>
      {isOpen && (
        <Box className="border-t border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600 md:px-5">
          {answer}
        </Box>
      )}
    </Box>
  );
}

function getSectionSavingsBadge(section: {
  key: DurationGroupKey;
  premium: GroupedPlanItem | null;
  premiumPlus: GroupedPlanItem | null;
}, monthlySavingsById: Map<string, string>) {
  const savingsCandidates = [section.premium, section.premiumPlus]
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

function AvatarStack() {
  return (
    <Box className="flex -space-x-2">
      {avatarSources.map((avatarSource, index) => (
        <Image
          key={avatarSource}
          src={`/images/${avatarSource}`}
          alt={`Student avatar ${index + 1}`}
          width={32}
          height={32}
          className="rounded-full border-2 border-white object-cover"
        />
      ))}
    </Box>
  );
}

function TestimonialCard({
  name,
  comment,
  source,
}: {
  name: string;
  comment: string;
  source: string;
}) {
  return (
    <Box className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Box className="flex items-center gap-3">
        <Image
          src={`/images/${source}`}
          alt={name}
          width={44}
          height={44}
          className="rounded-full object-cover"
        />
        <Box>
          <p className="font-semibold text-slate-900">{name}</p>
          <Box className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
          </Box>
        </Box>
      </Box>
      <p className="text-sm leading-6 text-slate-600">{comment}</p>
    </Box>
  );
}

interface PricingPageClientProps {
  plans: SerializedPlan[];
  pricingAbLayout: PricingAbLayout;
  /** When false (?s=1|2 preview), skip experiment page_view and checkout attribution. */
  pricingAbParticipatesInExperiment: boolean;
}

export default function PricingPageClient({
  plans,
  pricingAbLayout,
  pricingAbParticipatesInExperiment,
}: PricingPageClientProps) {
  const { isSignedIn } = useUser();
  const userContext = useUserContext();
  const pricingCheckoutFields = useMemo(
    () =>
      pricingAbParticipatesInExperiment
        ? { pricing_ab_layout: pricingAbLayout }
        : undefined,
    [pricingAbLayout, pricingAbParticipatesInExperiment]
  );

  useEffect(() => {
    if (!pricingAbParticipatesInExperiment) return;
    if (typeof window === "undefined") return;
    const key = `pricing_ab_pv_${pricingAbLayout}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/analytics/pricing-ab-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view", layout: pricingAbLayout }),
    });
  }, [pricingAbLayout, pricingAbParticipatesInExperiment]);

  const orderedPlans = useMemo(() => {
    return [...plans].sort((left, right) => {
      const leftOrder = left.order ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.order ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
  }, [plans]);

  const groupedPlans = useMemo(() => {
    const groupedEntries = new Map<DurationGroupKey, GroupedPlanItem[]>();

    orderedPlans.forEach((plan, index) => {
      const durationKey = getDurationGroupKey(plan);
      if (!durationKey) {
        return;
      }

      const nextItem = {
        plan,
        index,
        stableId: getStablePlanId(plan, index),
      };

      groupedEntries.set(durationKey, [...(groupedEntries.get(durationKey) || []), nextItem]);
    });

    return durationDisplayOrder
      .map((key) => {
        const items = groupedEntries.get(key) || [];
        const premiumPlus = items.find((item) => isPremiumPlusPlan(item.plan)) || null;
        const premium =
          items.find((item) => item.stableId !== premiumPlus?.stableId && !isPremiumPlusPlan(item.plan)) ||
          items.find((item) => item.stableId !== premiumPlus?.stableId) ||
          null;

        return {
          key,
          ...durationMeta[key],
          premium,
          premiumPlus,
        };
      })
      .filter((section) => section.premium || section.premiumPlus);
  }, [orderedPlans]);

  const availableDurationKeys = useMemo(() => {
    return groupedPlans.map((section) => section.key);
  }, [groupedPlans]);

  const personalizedRecommendation = useMemo(
    () =>
      buildPersonalizedRecommendation(
        availableDurationKeys,
        userContext,
        Boolean(isSignedIn)
      ),
    [availableDurationKeys, userContext, isSignedIn]
  );

  const recommendedSection = useMemo(() => {
    if (personalizedRecommendation) {
      const match = groupedPlans.find(
        (section) => section.key === personalizedRecommendation.planType
      );
      if (match) {
        return match;
      }
    }

    return (
      groupedPlans.find((section) => section.key === "threeMonth") ||
      groupedPlans.find((section) => section.key === "monthly") ||
      groupedPlans[0] ||
      null
    );
  }, [groupedPlans, personalizedRecommendation]);

  const recommendedPlanEntry = useMemo(() => {
    if (!recommendedSection) {
      return null;
    }

    if (recommendedSection.key === "threeMonth" || recommendedSection.key === "yearly") {
      return recommendedSection.premiumPlus || recommendedSection.premium || null;
    }

    return recommendedSection.premium || recommendedSection.premiumPlus || null;
  }, [recommendedSection]);

  const recommendedPlanId = recommendedPlanEntry?.stableId || null;
  const monthlySavingsById = useMemo(() => buildMonthlySavingsMap(orderedPlans), [orderedPlans]);
  const originalPriceFromWeeklyById = useMemo(
    () => buildOriginalPriceFromWeeklyMap(orderedPlans),
    [orderedPlans]
  );
  const freeWeeksLabelById = useMemo(
    () => buildFreeWeeksLabelFromWeeklyMap(orderedPlans),
    [orderedPlans]
  );

  const bestValuePlanEntry = useMemo(() => {
    return (
      groupedPlans.find((section) => section.key === "threeMonth")?.premiumPlus ||
      groupedPlans.find((section) => section.key === "threeMonth")?.premium ||
      groupedPlans.find((section) => section.key === "yearly")?.premiumPlus ||
      groupedPlans.find((section) => section.key === "yearly")?.premium ||
      recommendedPlanEntry ||
      null
    );
  }, [groupedPlans, recommendedPlanEntry]);

  const stickyCtaEntry = personalizedRecommendation ? recommendedPlanEntry : bestValuePlanEntry;

  const defaultStyleOneDurationKey = useMemo((): DurationGroupKey | null => {
    if (groupedPlans.length === 0) {
      return null;
    }
    const rec = personalizedRecommendation?.planType;
    if (rec && groupedPlans.some((s) => s.key === rec)) {
      return rec;
    }
    if (groupedPlans.some((s) => s.key === "threeMonth")) {
      return "threeMonth";
    }
    return groupedPlans[0]!.key;
  }, [groupedPlans, personalizedRecommendation]);

  const [styleOneDurationOverride, setStyleOneDurationOverride] =
    useState<DurationGroupKey | null>(null);

  useEffect(() => {
    if (
      styleOneDurationOverride &&
      !groupedPlans.some((s) => s.key === styleOneDurationOverride)
    ) {
      setStyleOneDurationOverride(null);
    }
  }, [groupedPlans, styleOneDurationOverride]);

  const styleOneSelectedDurationKey =
    (styleOneDurationOverride &&
    groupedPlans.some((s) => s.key === styleOneDurationOverride)
      ? styleOneDurationOverride
      : null) ??
    defaultStyleOneDurationKey;

  const activeStyleOneSection =
    (styleOneSelectedDurationKey &&
      groupedPlans.find((s) => s.key === styleOneSelectedDurationKey)) ||
    groupedPlans[0] ||
    null;

  const stickyCtaDurationKey = useMemo(() => {
    if (!stickyCtaEntry) {
      return null;
    }
    for (const s of groupedPlans) {
      if (
        s.premium?.stableId === stickyCtaEntry.stableId ||
        s.premiumPlus?.stableId === stickyCtaEntry.stableId
      ) {
        return s.key;
      }
    }
    return null;
  }, [groupedPlans, stickyCtaEntry]);

  return (
    <Box className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,_#F6F9FF_0%,_#FFFFFF_35%,_#F9FBFF_100%)] px-4 py-0 md:px-8 lg:px-10">
      <Box className="mx-auto w-full max-w-6xl">
        {!isSignedIn && (
          <Box className="rounded-[32px] border border-blue-100 bg-white px-5 py-6 shadow-[0_20px_60px_rgba(74,125,255,0.08)] md:px-8 md:py-8">
            <Box className="mx-auto max-w-4xl text-center">
              <Box className="mb-4 flex items-center justify-center gap-2">
                <SvgDiamond className="-rotate-30" />
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
                  Simple pricing
                </span>
              </Box>
              <h1 className="text-3xl font-semibold leading-tight text-blue-950 md:text-5xl">
                Choose the plan that matches your CELPIP timeline
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Start with the study length that fits your exam date, then choose
                the access level you need. Premium covers daily practice. Premium
                Plus adds mock exams for full-test preparation.
              </p>
            </Box>

            <Box className="mt-6 flex flex-nowrap items-stretch justify-center gap-3">
              <Box className="flex min-h-[42px] items-center justify-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-medium text-slate-700 whitespace-nowrap">
                <AvatarStack />
                <span className="whitespace-nowrap">Trusted by 70k+ test-takers</span>
              </Box>
              {pricingHeroStats.slice(1).map((stat) => (
                <Box
                  key={stat}
                  className="flex min-h-[52px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-medium text-slate-700 whitespace-nowrap"
                >
                  {stat}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {personalizedRecommendation && recommendedPlanEntry && (
          <Box className="mt-6 rounded-[24px] border border-blue-200 bg-[linear-gradient(90deg,_rgba(74,125,255,0.08)_0%,_rgba(247,157,101,0.08)_100%)] px-5 py-5 shadow-sm">
            <Box className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Box>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
                  Recommended for you
                </p>
                <h2 className="mt-1 text-lg font-semibold text-blue-950">
                  {personalizedRecommendation.headline}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  {personalizedRecommendation.summary}
                </p>
              </Box>
              <a
                href="#pricing-style-one"
                onClick={
                  recommendedSection
                    ? () => setStyleOneDurationOverride(recommendedSection.key)
                    : undefined
                }
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-blue-950 px-5 text-sm font-semibold text-white"
              >
                View recommended plan
              </a>
            </Box>
            {personalizedRecommendation.reasons.length > 0 && (
              <Box className="mt-4 flex flex-wrap gap-2">
                {personalizedRecommendation.reasons.slice(0, 3).map((reason) => (
                  <Box
                    key={reason}
                    className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {reason}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {activeStyleOneSection && (
          <Box
            id="pricing-style-one"
            className={`mt-8 rounded-[28px] border bg-white p-5 shadow-sm md:p-8 ${
              activeStyleOneSection.key === "threeMonth"
                ? "border-amber-200 shadow-[0_16px_40px_rgba(247,157,101,0.10)]"
                : recommendedSection?.key === activeStyleOneSection.key
                  ? "border-blue-200 shadow-[0_16px_40px_rgba(117,156,255,0.10)]"
                  : "border-slate-200"
            }`}
          >
            <Box className="flex min-w-0 flex-col">
              <p
                id="pricing-style-one-duration-label"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Billing period
              </p>
              <Box
                className="mt-2 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:flex-nowrap sm:gap-0.5"
                role="tablist"
                aria-labelledby="pricing-style-one-duration-label"
              >
                {durationDisplayOrder
                  .filter((key) => groupedPlans.some((s) => s.key === key))
                  .map((key) => {
                    const sec = groupedPlans.find((s) => s.key === key)!;
                    const selected =
                      key === (styleOneSelectedDurationKey ?? activeStyleOneSection.key);
                    const tabSavingsBadge = getSectionSavingsBadge(sec, monthlySavingsById);
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        id={`pricing-duration-tab-${key}`}
                        onClick={() => setStyleOneDurationOverride(key)}
                        className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-center transition-all sm:px-3 sm:py-2.5 ${
                          selected
                            ? key === "threeMonth"
                              ? "bg-white font-semibold text-amber-950 shadow-sm ring-1 ring-amber-200/90"
                              : "bg-white font-semibold text-blue-950 shadow-sm ring-1 ring-slate-200/80"
                            : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        }`}
                      >
                        <span className="block text-sm font-semibold leading-tight">
                          {sec.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {sec.eyebrow}
                        </span>
                        {tabSavingsBadge ? (
                          <span
                            className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] sm:px-2.5 sm:text-[10px] ${
                              selected
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-emerald-50/70 text-emerald-700/90"
                            }`}
                          >
                            {tabSavingsBadge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
              </Box>
            </Box>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {activeStyleOneSection.summary}
            </p>
            <Box className="mt-6">
              <PricingStyleOnePlanTable
                section={activeStyleOneSection}
                pricingCheckoutFields={pricingCheckoutFields}
                pricingAbLayout={
                  pricingAbParticipatesInExperiment ? pricingAbLayout : undefined
                }
                recommendedPlanId={recommendedPlanId}
                recommendedSectionKey={recommendedSection?.key}
                originalPriceFromWeeklyById={originalPriceFromWeeklyById}
                freeWeeksLabelById={freeWeeksLabelById}
              />
            </Box>
          </Box>
        )}

        <Box
          id="compare-access"
          className="mt-12 rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm md:p-6"
        >
          <Box className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
              Compare access levels
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-950">
              Premium vs Premium Plus
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Pick Premium for daily skill practice. Choose Premium Plus if you
              also want mock exams and the fullest prep experience.
            </p>
          </Box>

          <Box className="mt-6 grid gap-4 md:grid-cols-2">
            <Box className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                Premium
              </p>
              <h3 className="mt-2 text-xl font-semibold text-blue-950">
                Best for focused daily practice
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Includes practice questions, AI feedback, study support, full
                exam experience, and progress tracking.
              </p>
            </Box>
            <Box className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,_rgba(255,244,219,0.9)_0%,_rgba(255,255,255,0.95)_100%)] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-amber-700">
                Premium Plus
              </p>
              <h3 className="mt-2 text-xl font-semibold text-blue-950">
                Best for full exam preparation
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Includes everything in Premium, plus mock exams for a more
                complete and realistic prep journey.
              </p>
            </Box>
          </Box>

          <Box className="mt-6 hidden overflow-hidden rounded-[20px] border border-slate-200 bg-white md:block">
            <Box className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-slate-200 bg-slate-50">
              <Box className="px-5 py-4 text-sm font-semibold text-slate-600">
                Feature
              </Box>
              <Box className="px-5 py-4 text-center text-sm font-semibold text-slate-700">
                Premium
              </Box>
              <Box className="px-5 py-4 text-center text-sm font-semibold text-amber-700">
                Premium Plus
              </Box>
            </Box>
            {comparisonRows.map((row) => (
              <Box
                key={row.label}
                className="grid grid-cols-[1.5fr_1fr_1fr] border-b border-slate-100 last:border-b-0"
              >
                <Box className="px-5 py-4 text-sm text-slate-700">{row.label}</Box>
                <Box className="flex items-center justify-center px-5 py-4">
                  {row.premium ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not included</span>
                  )}
                </Box>
                <Box className="flex items-center justify-center px-5 py-4">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                </Box>
              </Box>
            ))}
          </Box>

          <Box className="mt-5 grid gap-3 md:hidden">
            {comparisonRows.map((row) => (
              <Box
                key={row.label}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                <Box className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">Premium</span>
                  <span
                    className={
                      row.premium ? "font-semibold text-emerald-600" : "font-medium text-slate-400"
                    }
                  >
                    {row.premium ? "Included" : "Not included"}
                  </span>
                </Box>
                <Box className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">Premium Plus</span>
                  <span className="font-semibold text-emerald-600">Included</span>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box className="mt-12 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <Box className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
              Social proof
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-950">
              Trusted by CELPIP students
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Students use these practice tools to build familiarity,
              confidence, and consistency before test day.
            </p>
          </Box>
          <Box className="mt-6 grid gap-4 lg:grid-cols-4">
            {pricingTestimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </Box>
        </Box>

        <Box className="mt-12 pb-16">
          <Box className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
              Common questions
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-950">FAQs</h2>
          </Box>
          <Box className="mt-6 grid gap-3">
            {pricingFaqs.map((faq) => (
              <FAQItem key={faq.question} {...faq} />
            ))}
          </Box>
        </Box>
      </Box>

      {stickyCtaEntry && (
        <Box className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <Box className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Box className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                {personalizedRecommendation ? "Recommended" : "Best value"}
              </p>
              <p className="truncate text-sm font-semibold text-blue-950">
                {stickyCtaEntry.plan.title}
              </p>
              <p className="text-xs text-slate-600">
                {personalizedRecommendation?.headline || "See the strongest-value option"}
              </p>
            </Box>
            <a
              href="#pricing-style-one"
              onClick={
                stickyCtaDurationKey
                  ? () => setStyleOneDurationOverride(stickyCtaDurationKey)
                  : undefined
              }
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] px-4 py-2 text-sm font-semibold text-white shadow-md"
            >
              <AutoAwesome className="mr-2 h-4 w-4" />
              View plan
            </a>
          </Box>
        </Box>
      )}
    </Box>
  );
}
