"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Check from "@mui/icons-material/Check";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import ChevronUp from "@mui/icons-material/KeyboardArrowUp";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Star from "@mui/icons-material/Star";
import SvgDiamond from "@/components/icons/Diamond";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import {
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
  getDurationGroupKey,
  getStablePlanId,
  isPremiumPlusPlan,
  parsePrice,
  PRICING_PLUS_FEATURE_LABELS,
} from "@/lib/pricing";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import type { DurationGroupKey, PricingFaq, SerializedPlan } from "@/types/pricing";
const avatarSources = ["Carlos.png", "Li.png", "Tatiana.png"];

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

function pricingStyleOnePriceCell(
  item: GroupedPlanItem | null | undefined,
  originalPriceFromWeeklyById: Map<string, string>,
  freeWeeksLabelById: Map<string, string>,
  align: "center" | "start" = "center"
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
    <div
      className={`flex flex-col gap-1 py-1 ${align === "center" ? "items-center" : "items-start"}`}
    >
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

function PricingStyleOnePlanTable() {
  return (
    <Box className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[280px] border-collapse text-left text-[11px] leading-snug sm:text-[12px]">
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
              className="w-[34%] px-1 py-2.5 text-center font-semibold text-blue-950 sm:px-3"
            >
              Plus
            </th>
          </tr>
        </thead>
        <tbody>
          {PRICING_PLUS_FEATURE_LABELS.map((label) => (
            <tr
              key={label}
              className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60"
            >
              <td className="px-2 py-1.5 text-slate-700 sm:px-3 sm:py-2">{label}</td>
              <td className="px-1 py-1.5 text-center sm:px-3 sm:py-2">
                <Check
                  className="mx-auto size-3.5 text-emerald-600 sm:size-4"
                  strokeWidth={2.5}
                  aria-label={`Included in Plus: ${label}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

type PricingPlanSection = {
  key: DurationGroupKey;
  plus: GroupedPlanItem | null;
  title: string;
  eyebrow: string;
  summary: string;
};

function PricingPlanCheckoutTile({
  section,
  pricingCheckoutFields,
  pricingAbLayout,
  monthlySavingsById,
  originalPriceFromWeeklyById,
  freeWeeksLabelById,
  recommendedPlanId,
  recommendedSectionKey,
}: {
  section: PricingPlanSection;
  pricingCheckoutFields?: Record<string, string>;
  pricingAbLayout?: PricingAbLayout;
  monthlySavingsById: Map<string, string>;
  originalPriceFromWeeklyById: Map<string, string>;
  freeWeeksLabelById: Map<string, string>;
  recommendedPlanId: string | null;
  recommendedSectionKey: DurationGroupKey | null | undefined;
}) {
  const item = section.plus;
  const { user, isSignedIn, isLoaded } = useUser();
  const { selectItem, beginCheckout } = useEcommerceTracking();
  const attribution = useCheckoutAttributionPayload();

  const isRecommended =
    Boolean(item && recommendedPlanId) &&
    recommendedSectionKey === section.key &&
    item.stableId === recommendedPlanId;

  if (!item?.plan.stripePriceId) {
    return (
      <div
        id={isRecommended ? "recommended-plan" : undefined}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500"
      >
        {section.title} — Unavailable
      </div>
    );
  }

  const p = item.plan;
  const stripePriceId = p.stripePriceId;
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

  const onCheckout = () => {
    trackCheckoutIntent();
    submitStripeCheckout();
  };

  const savingsBadge = getSectionSavingsBadge(
    { key: section.key, plus: item },
    monthlySavingsById
  );

  const emphasisThreeMonth = section.key === "threeMonth";

  return (
    <button
      type="button"
      id={isRecommended ? "recommended-plan" : undefined}
      onClick={onCheckout}
      disabled={!checkoutAction}
      aria-label={`Subscribe to Plus ${section.title}`}
      className={`relative flex h-full min-h-0 w-full min-w-0 flex-col gap-4 rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:ring-offset-2 sm:px-4 sm:py-4 ${
        isRecommended ? "scroll-mt-24 md:scroll-mt-28" : ""
      } ${
        emphasisThreeMonth
          ? "border-amber-300 bg-amber-50/70 hover:border-amber-400 hover:bg-amber-50"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {savingsBadge ? (
        <span
          className="pointer-events-none absolute -right-1 -top-2 z-[5] max-w-[min(100%,12rem)] truncate rounded-full border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800 shadow-sm ring-2 ring-white sm:text-[10px]"
          title={savingsBadge}
        >
          {savingsBadge}
        </span>
      ) : null}
      <div
        className={`flex min-h-0 flex-1 flex-col pt-0.5 ${savingsBadge ? "pr-1 sm:pr-[5.5rem]" : ""}`}
      >
        <span className="text-sm font-semibold text-blue-950 sm:text-[15px]">{section.title}</span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {section.eyebrow}
        </span>
        <div className="mt-3 border-t border-slate-200/80 pt-3">
          {pricingStyleOnePriceCell(item, originalPriceFromWeeklyById, freeWeeksLabelById, "start")}
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-snug text-slate-600">{section.summary}</p>
      </div>
      <span className="flex h-10 w-full shrink-0 items-center justify-center rounded-full bg-[#635BFF] text-sm font-semibold text-white shadow-sm">
        Subscribe
      </span>
    </button>
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
        "A short Weekly plan is the best fit when your exam is close and your prep is focused.",
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
  plus: GroupedPlanItem | null;
}, monthlySavingsById: Map<string, string>) {
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
        const plus = items.find((item) => isPremiumPlusPlan(item.plan)) || null;

        return {
          key,
          ...durationMeta[key],
          plus,
        };
      })
      .filter((section) => section.plus);
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

    return recommendedSection.plus || null;
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
      groupedPlans.find((section) => section.key === "threeMonth")?.plus ||
      groupedPlans.find((section) => section.key === "yearly")?.plus ||
      recommendedPlanEntry ||
      null
    );
  }, [groupedPlans, recommendedPlanEntry]);

  const stickyCtaEntry = personalizedRecommendation ? recommendedPlanEntry : bestValuePlanEntry;

  const styleOneVisibleDurationKeys = useMemo(
    () => durationDisplayOrder.filter((key) => groupedPlans.some((s) => s.key === key)),
    [groupedPlans]
  );

  const styleOneDurationButtonGridClass = useMemo(() => {
    const n = styleOneVisibleDurationKeys.length;
    if (n <= 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-1 sm:grid-cols-2";
    if (n === 3) return "grid-cols-1 sm:grid-cols-3";
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  }, [styleOneVisibleDurationKeys]);

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
                Plus plans built around your CELPIP timeline
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Pick the billing period that fits your exam date. Plus includes mock
                exams, full exam simulation, AI feedback, and the full question bank.
                Each Subscriber plan includes up to 2 devices. If you need more than
                2 devices, get another subscription of the same plan for each
                additional device.
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
                href="#recommended-plan"
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

        {groupedPlans.length > 0 && (
          <Box
            id="pricing-style-one"
            className={`mt-8 rounded-[28px] border bg-white p-5 shadow-sm md:p-8 ${
              recommendedSection && personalizedRecommendation
                ? "border-blue-200 shadow-[0_16px_40px_rgba(117,156,255,0.10)]"
                : "border-slate-200"
            }`}
          >
            <p className="text-sm leading-6 text-slate-600 md:text-[15px] md:leading-7">
              Every billing period includes the same Plus features. Choose your timeline
              below—each option shows the price and takes you straight to Stripe checkout.
            </p>
            <Box className="mt-6">
              <PricingStyleOnePlanTable />
            </Box>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Secure checkout with Stripe. Apple Pay and Google Pay are available where
              supported.
            </p>
            <Box className="mt-6 flex min-w-0 flex-col border-t border-slate-100 pt-6">
              <p
                id="pricing-style-one-duration-label"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                Choose billing period
              </p>
              <Box
                className={`mt-3 grid items-stretch gap-2 sm:gap-3 ${styleOneDurationButtonGridClass}`}
                role="group"
                aria-labelledby="pricing-style-one-duration-label"
              >
                {styleOneVisibleDurationKeys.map((key) => {
                  const sec = groupedPlans.find((s) => s.key === key)!;
                  return (
                    <PricingPlanCheckoutTile
                      key={key}
                      section={sec}
                      pricingCheckoutFields={pricingCheckoutFields}
                      pricingAbLayout={
                        pricingAbParticipatesInExperiment ? pricingAbLayout : undefined
                      }
                      monthlySavingsById={monthlySavingsById}
                      originalPriceFromWeeklyById={originalPriceFromWeeklyById}
                      freeWeeksLabelById={freeWeeksLabelById}
                      recommendedPlanId={recommendedPlanId}
                      recommendedSectionKey={recommendedSection?.key}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}

        <Box
          id="whats-in-plus"
          className="mt-12 rounded-[28px] border border-blue-100 bg-white p-5 shadow-sm md:p-8"
        >
          <Box className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-blue-700">
              One full-access tier
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-950 md:text-3xl">
              Everything in Plus
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">
              Every paid timeline includes the same features—only the billing period
              changes. Pick Weekly, Monthly, 3-Month, or Yearly based on how long you
              want to prepare.
            </p>
          </Box>

          <Box className="mx-auto mt-8 max-w-4xl rounded-[24px] border border-amber-200/80 bg-[linear-gradient(180deg,_rgba(255,248,235,0.95)_0%,_#FFFFFF_55%)] p-6 md:p-8">
            <p className="text-center text-sm font-semibold uppercase tracking-[0.08em] text-amber-800">
              Plus includes
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:gap-4">
              {PRICING_PLUS_FEATURE_LABELS.map((label) => (
                <li
                  key={label}
                  className="flex gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm"
                >
                  <Check
                    className="mt-0.5 size-5 shrink-0 text-emerald-600"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span className="text-sm font-medium leading-snug text-slate-800">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
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
              href={personalizedRecommendation ? "#recommended-plan" : "#pricing-style-one"}
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
