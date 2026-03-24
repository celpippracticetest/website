"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Check, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Star } from "lucide-react";
import SvgBestValuePlan from "@/components/icons/BestValuePlan";
import SvgDiamond from "@/components/icons/Diamond";
import SvgFreePlan from "@/components/icons/FreePlan";
import SvgPopularPlan from "@/components/icons/PopularPlan";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import PlanCard from "@/components/pages/plans/PlanCard";
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
  buildMonthlySavingsMap,
  formatBillingCycle,
  formatPlanCadPrice,
  getAccessLabel,
  getDurationGroupKey,
  getFooterNote,
  getPlanDescription,
  getPricingCompactPlanCardFeatures,
  getStablePlanId,
  isPremiumPlusPlan,
  parsePrice,
  PRICING_TIER_COMPARISON_ROWS,
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

function PricingStyleOneSubscribeForm({
  item,
  pricingCheckoutFields,
  anchorId,
}: {
  item: GroupedPlanItem | null;
  pricingCheckoutFields?: Record<string, string>;
  anchorId?: string;
}) {
  const { user } = useUser();
  const { selectItem, beginCheckout } = useEcommerceTracking();

  if (!item?.plan.stripePriceId) {
    return <span className="text-sm text-slate-400">Unavailable</span>;
  }

  const p = item.plan;
  const checkoutAction = `/api/checkout_session?price=${p.stripePriceId}`;
  const normalizedPrice = parsePrice(p.price);
  const trackingItem = {
    item_id: p.planTitle,
    item_name: p.title,
    price: normalizedPrice,
    quantity: 1,
    item_brand: "CELPIP Practice Test",
    item_category: "Subscription",
  };

  const handleClick = () => {
    selectItem([trackingItem], "plans_page", "Pricing Plans");
    beginCheckout([trackingItem], "CAD", normalizedPrice, undefined, {
      email: user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user?.firstName || "",
        last_name: user?.lastName || "",
      },
    });
  };

  return (
    <form
      id={anchorId}
      action={checkoutAction}
      method="POST"
      className="mx-auto w-full max-w-[220px]"
    >
      <CheckoutAttributionFields />
      {pricingCheckoutFields &&
        Object.entries(pricingCheckoutFields).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null
        )}
      <button
        type="submit"
        onClick={handleClick}
        className="flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] text-sm font-semibold text-white shadow-md hover:opacity-95"
      >
        Subscribe
      </button>
    </form>
  );
}

function pricingStyleOnePriceCell(plan: SerializedPlan | null | undefined) {
  if (!plan) {
    return <span className="text-slate-400">—</span>;
  }
  const cycle = formatBillingCycle(plan.billingInterval, plan.billingIntervalCount);
  const oldP = plan.oldPrice && Number.parseFloat(plan.oldPrice) > 0;
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      {oldP && (
        <span className="text-xs font-medium text-slate-400 line-through">
          CA$ {formatPlanCadPrice(plan.oldPrice)}
        </span>
      )}
      <span className="text-lg font-bold text-blue-950">
        CA$ {formatPlanCadPrice(plan.price)}
      </span>
      {cycle ? (
        <span className="text-[11px] font-medium text-slate-500">per {cycle}</span>
      ) : null}
    </div>
  );
}

function PricingStyleOnePlanTable({
  section,
  pricingCheckoutFields,
  recommendedPlanId,
  recommendedSectionKey,
}: {
  section: {
    key: DurationGroupKey;
    premium: GroupedPlanItem | null;
    premiumPlus: GroupedPlanItem | null;
  };
  pricingCheckoutFields?: Record<string, string>;
  recommendedPlanId: string | null;
  recommendedSectionKey: DurationGroupKey | null | undefined;
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
              {pricingStyleOnePriceCell(prem?.plan)}
            </td>
            <td className="px-1 py-2 text-center sm:px-3">
              {pricingStyleOnePriceCell(plus?.plan)}
            </td>
          </tr>
          <tr className="border-t border-slate-100 bg-white">
            <td className="px-2 py-3 font-semibold text-slate-800 sm:px-3">
              Subscribe
            </td>
            <td className="px-1 py-3 text-center align-top sm:px-3">
              <PricingStyleOneSubscribeForm
                item={prem}
                pricingCheckoutFields={pricingCheckoutFields}
                anchorId={recommendedAnchor(prem)}
              />
            </td>
            <td className="px-1 py-3 text-center align-top sm:px-3">
              <PricingStyleOneSubscribeForm
                item={plus}
                pricingCheckoutFields={pricingCheckoutFields}
                anchorId={recommendedAnchor(plus)}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );
}

function getIconComponent(iconType?: string) {
  switch (iconType) {
    case "BestValuePlan":
      return <SvgBestValuePlan />;
    case "PopularPlan":
      return <SvgPopularPlan />;
    case "FreePlan":
      return <SvgFreePlan />;
    default:
      return <SvgFreePlan />;
  }
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

type AccessTierChoice = "premium" | "premiumPlus";

function PremiumAccessSegmentedToggle({
  value,
  onChange,
}: {
  value: AccessTierChoice;
  onChange: (next: AccessTierChoice) => void;
}) {
  return (
    <Box
      className="inline-flex w-full max-w-md rounded-full border border-slate-200 bg-slate-100 p-1 sm:w-auto"
      role="group"
      aria-label="Choose Premium or Premium Plus"
    >
      <button
        type="button"
        onClick={() => onChange("premium")}
        className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:flex-none sm:min-w-[120px] ${
          value === "premium"
            ? "bg-white text-blue-950 shadow-sm"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Premium
      </button>
      <button
        type="button"
        onClick={() => onChange("premiumPlus")}
        className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:flex-none sm:min-w-[140px] ${
          value === "premiumPlus"
            ? "bg-white text-amber-900 shadow-sm ring-1 ring-amber-200/80"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        Premium Plus
      </button>
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
  const [tierByDuration, setTierByDuration] = useState<
    Partial<Record<DurationGroupKey, AccessTierChoice>>
  >({});

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
    <Box className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,_#F6F9FF_0%,_#FFFFFF_35%,_#F9FBFF_100%)] p-4 md:p-8 lg:p-10">
      <Box className="mx-auto w-full max-w-6xl">
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
                href={
                  pricingAbLayout === "two_card"
                    ? "#pricing-style-one"
                    : `#duration-${recommendedSection?.key || "threeMonth"}`
                }
                onClick={
                  pricingAbLayout === "two_card" && recommendedSection
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

        {pricingAbLayout === "two_card" && activeStyleOneSection ? (
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
                recommendedPlanId={recommendedPlanId}
                recommendedSectionKey={recommendedSection?.key}
              />
            </Box>
          </Box>
        ) : (
        <Box className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-flow-col lg:grid-cols-none lg:auto-cols-fr lg:grid-rows-1 lg:items-stretch">
          {groupedPlans.map((section) => {
            const visiblePlanItems = [section.premium, section.premiumPlus].filter(Boolean) as GroupedPlanItem[];
            const sectionSavingsBadge = getSectionSavingsBadge(section, monthlySavingsById);

            return (
              <Box
                key={section.key}
                id={`duration-${section.key}`}
                className={`flex h-full min-h-0 min-w-0 flex-col rounded-[28px] border bg-white p-5 shadow-sm ${
                  section.key === "threeMonth"
                    ? "border-amber-200 shadow-[0_16px_40px_rgba(247,157,101,0.10)]"
                    : recommendedSection?.key === section.key
                      ? "border-blue-200 shadow-[0_16px_40px_rgba(117,156,255,0.10)]"
                      : "border-slate-200"
                }`}
              >
                <Box className="shrink-0">
                  <Box className="flex flex-col gap-2 sm:gap-3">
                    <Box className="grid grid-cols-[minmax(min-content,1fr)_auto] items-start gap-x-2 gap-y-2 sm:gap-x-3">
                      <Box className="min-w-0">
                        <p
                          className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                            section.key === "threeMonth" ? "text-amber-700" : "text-slate-500"
                          }`}
                        >
                          {section.eyebrow}
                        </p>
                        <h3 className="mt-1 whitespace-nowrap text-2xl font-semibold text-blue-950">
                          {section.title}
                        </h3>
                      </Box>
                      <Box className="flex w-max max-w-full flex-nowrap items-center justify-end justify-self-end gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] pl-1 [&::-webkit-scrollbar]:hidden">
                        {recommendedSection?.key === section.key && (
                          <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700 sm:px-3 sm:text-[11px]">
                            Recommended
                          </span>
                        )}
                        {section.badge && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 sm:px-3 sm:text-[11px]">
                            {section.badge}
                          </span>
                        )}
                        {sectionSavingsBadge && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 sm:px-3 sm:text-[11px]">
                            {sectionSavingsBadge}
                          </span>
                        )}
                      </Box>
                    </Box>
                    <p className="w-full min-w-0 text-sm leading-6 text-slate-600">
                      {section.summary}
                    </p>
                  </Box>
                </Box>

                {(() => {
                  const defaultTier: AccessTierChoice = (() => {
                    if (recommendedSection?.key === section.key && recommendedPlanEntry) {
                      return isPremiumPlusPlan(recommendedPlanEntry.plan)
                        ? "premiumPlus"
                        : "premium";
                    }
                    if (section.premium && !section.premiumPlus) return "premium";
                    if (!section.premium && section.premiumPlus) return "premiumPlus";
                    return "premium";
                  })();
                  const tier = tierByDuration[section.key] ?? defaultTier;
                  const useSwitchLayout =
                    pricingAbLayout === "switch_toggle" &&
                    Boolean(section.premium && section.premiumPlus);
                  const activeItem = useSwitchLayout
                    ? tier === "premiumPlus"
                      ? section.premiumPlus!
                      : section.premium!
                    : null;

                  const planCardForItem = (item: GroupedPlanItem) => {
                    const { features: compactFeatures, leadingBoldFeatureCount } =
                      getPricingCompactPlanCardFeatures(item.plan);
                    return (
                    <PlanCard
                      id={item.index}
                      title={item.plan.title}
                      type={item.plan.type}
                      oldPrice={item.plan.oldPrice}
                      price={item.plan.price}
                      discount={item.plan.discount}
                      buttonTitle="Subscribe"
                      features={compactFeatures}
                      leadingBoldFeatureCount={leadingBoldFeatureCount}
                      stripePriceId={item.plan.stripePriceId}
                      billingInterval={item.plan.billingInterval}
                      billingIntervalCount={item.plan.billingIntervalCount}
                      icon={getIconComponent(item.plan.iconType)}
                      iconWrapperColor={item.plan.iconWrapperColor || "bg-purple5"}
                      currentPlanTitle=""
                      planTitle={item.plan.planTitle || item.plan.title}
                      compact
                      highlight={
                        recommendedPlanId === item.stableId ||
                        (section.key === "threeMonth" && isPremiumPlusPlan(item.plan))
                      }
                      savingsText={undefined}
                      highlightLabel={
                        recommendedPlanId === item.stableId
                          ? "Recommended"
                          : (section.key === "threeMonth" || section.key === "yearly") &&
                              isPremiumPlusPlan(item.plan)
                            ? "Best value"
                            : undefined
                      }
                      accessLabel={getAccessLabel(item.plan)}
                      description={getPlanDescription(item.plan)}
                      footerNote={getFooterNote(item.plan)}
                      checkoutHiddenFields={pricingCheckoutFields}
                    />
                    );
                  };

                  if (useSwitchLayout && activeItem) {
                    return (
                      <Box className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
                        <Box className="flex shrink-0 justify-center">
                          <PremiumAccessSegmentedToggle
                            value={tier}
                            onChange={(next) =>
                              setTierByDuration((prev) => ({ ...prev, [section.key]: next }))
                            }
                          />
                        </Box>
                        <Box className="mx-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col">
                          <Box
                            key={activeItem.stableId}
                            className="flex h-full min-h-[220px] min-w-0 flex-1 flex-col"
                            id={
                              recommendedPlanId === activeItem.stableId
                                ? "recommended-plan"
                                : undefined
                            }
                          >
                            {planCardForItem(activeItem)}
                          </Box>
                        </Box>
                      </Box>
                    );
                  }

                  return (
                    <Box className="mt-3 flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
                      <Box className="grid h-full min-h-0 w-full min-w-0 flex-1 auto-rows-fr grid-cols-1 gap-1">
                        {visiblePlanItems.map((item) => (
                          <Box
                            key={item.stableId}
                            className="flex h-full min-h-[220px] min-w-0 flex-col"
                            id={
                              recommendedPlanId === item.stableId
                                ? "recommended-plan"
                                : undefined
                            }
                          >
                            {planCardForItem(item)}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })()}
              </Box>
            );
          })}
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
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not included</span>
                  )}
                </Box>
                <Box className="flex items-center justify-center px-5 py-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
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
              href={
                pricingAbLayout === "two_card"
                  ? "#pricing-style-one"
                  : personalizedRecommendation
                    ? "#recommended-plan"
                    : `#duration-${recommendedSection?.key || "threeMonth"}`
              }
              onClick={
                pricingAbLayout === "two_card" && stickyCtaDurationKey
                  ? () => setStyleOneDurationOverride(stickyCtaDurationKey)
                  : undefined
              }
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] px-4 py-2 text-sm font-semibold text-white shadow-md"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              View plan
            </a>
          </Box>
        </Box>
      )}
    </Box>
  );
}
