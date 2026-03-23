"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, Star } from "lucide-react";
import SvgBestValuePlan from "@/components/icons/BestValuePlan";
import SvgDiamond from "@/components/icons/Diamond";
import SvgFreePlan from "@/components/icons/FreePlan";
import SvgPopularPlan from "@/components/icons/PopularPlan";
import PlanCard from "@/components/pages/plans/PlanCard";
import {
  comparisonRows,
  pricingFaqs,
  pricingHeroStats,
  pricingTestimonials,
} from "@/components/pages/pricing/pricingContent";
import { Box } from "@/components/ui/Box";
import { useEngagementTracking } from "@/hooks/useTracking";
import { useUserContext } from "@/hooks/useUserContext";
import { durationDisplayOrder, durationMeta } from "@/lib/pricingCatalog";
import {
  buildMonthlySavingsMap,
  getAccessLabel,
  getPlanButtonLabel,
  getDurationGroupKey,
  getFooterNote,
  getPlanDescription,
  getStablePlanId,
  isPremiumPlusPlan,
} from "@/lib/pricing";
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
      const savingsText =
        (section.key === "threeMonth" || section.key === "yearly") &&
        isPremiumPlusPlan(item!.plan)
          ? "Best value"
          : monthlySavingsById.get(item!.stableId);

      if (!savingsText) {
        return null;
      }

      const numericMatch = savingsText.match(/(\d+)/);
      const numericValue = numericMatch ? Number.parseInt(numericMatch[1], 10) : 0;

      return {
        label: savingsText === "Best value" ? "Best value" : `Save ${numericValue}%`,
        score: savingsText === "Best value" ? Number.MAX_SAFE_INTEGER : numericValue,
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
}

export default function PricingPageClient({ plans }: PricingPageClientProps) {
  const { isSignedIn } = useUser();
  const userContext = useUserContext();

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
                href={`#duration-${recommendedSection?.key || "threeMonth"}`}
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

        <Box className="mt-8 grid gap-5 xl:grid-cols-2">
          {groupedPlans.map((section) => {
            const visiblePlanItems = [section.premium, section.premiumPlus].filter(Boolean) as GroupedPlanItem[];
            const sectionSavingsBadge = getSectionSavingsBadge(section, monthlySavingsById);

            return (
              <Box
                key={section.key}
                id={`duration-${section.key}`}
                className={`rounded-[28px] border bg-white p-5 shadow-sm ${
                  section.key === "threeMonth"
                    ? "border-amber-200 shadow-[0_16px_40px_rgba(247,157,101,0.10)]"
                    : recommendedSection?.key === section.key
                      ? "border-blue-200 shadow-[0_16px_40px_rgba(117,156,255,0.10)]"
                      : "border-slate-200"
                }`}
              >
                <Box className="flex flex-wrap items-start justify-between gap-3">
                  <Box className="max-w-xl">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        section.key === "threeMonth" ? "text-amber-700" : "text-slate-500"
                      }`}
                    >
                      {section.eyebrow}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold text-blue-950">
                      {section.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {section.summary}
                    </p>
                  </Box>
                  <Box className="flex flex-wrap gap-2">
                    {recommendedSection?.key === section.key && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700">
                        Recommended
                      </span>
                    )}
                    {section.badge && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                        {section.badge}
                      </span>
                    )}
                    {sectionSavingsBadge && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                        {sectionSavingsBadge}
                      </span>
                    )}
                  </Box>
                </Box>

                <Box className={`mt-5 grid gap-3 ${visiblePlanItems.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                  {visiblePlanItems.map((item) => (
                    <Box
                      key={item.stableId}
                      id={recommendedPlanId === item.stableId ? "recommended-plan" : undefined}
                    >
                      <PlanCard
                        id={item.index}
                        title={item.plan.title}
                        type={item.plan.type}
                        oldPrice={item.plan.oldPrice}
                        price={item.plan.price}
                        discount={item.plan.discount}
                        buttonTitle={getPlanButtonLabel(item.plan)}
                        features={item.plan.features}
                        stripePriceId={item.plan.stripePriceId}
                        billingInterval={item.plan.billingInterval}
                        billingIntervalCount={item.plan.billingIntervalCount}
                        icon={getIconComponent(item.plan.iconType)}
                        iconWrapperColor={item.plan.iconWrapperColor || "bg-purple5"}
                        currentPlanTitle=""
                        planTitle={item.plan.planTitle || item.plan.title}
                        compact
                        featureLimit={3}
                        mockExamStatus={isPremiumPlusPlan(item.plan) ? "included" : "notIncluded"}
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
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>

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
              href={personalizedRecommendation ? "#recommended-plan" : `#duration-${recommendedSection?.key || "threeMonth"}`}
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
