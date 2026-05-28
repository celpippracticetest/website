"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import ChevronUp from "@mui/icons-material/KeyboardArrowUp";
import AutoAwesome from "@mui/icons-material/AutoAwesome";
import Close from "@mui/icons-material/Close";
import Shield from "@mui/icons-material/Shield";
import Star from "@mui/icons-material/Star";
import { PricingCheckoutLayout } from "@/components/pages/pricing/PricingCheckoutLayout";
import { PricingModalPlanList } from "@/components/pages/pricing/PricingModalPlanList";
import { cn } from "@/lib/utils";
import {
  pricingFaqs,
  pricingTestimonials,
} from "@/components/pages/pricing/pricingContent";
import { Box } from "@/components/ui/Box";
import { useEngagementTracking } from "@/hooks/useTracking";
import { useUserContext } from "@/hooks/useUserContext";
import {
  formatBillingCycle,
  formatPlanCadPrice,
  PRICING_PLUS_FEATURE_LABELS,
} from "@/lib/pricing";
import { groupPlansByDuration, sortPlansByOrder } from "@/lib/pricingPlanSections";
import { durationDisplayOrder } from "@/lib/pricingCatalog";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import type { DurationGroupKey, PricingFaq, SerializedPlan } from "@/types/pricing";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
const avatarSources = ["Carlos.png", "Li.png", "Tatiana.png"];

type PersonalizedRecommendation = {
  planType: DurationGroupKey;
  headline: string;
  summary: string;
  reasons: string[];
};

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
    <Box className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300">
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
  const [mobilePlansSheetOpen, setMobilePlansSheetOpen] = useState(false);
  const { isSignedIn } = useHybridWebUser();
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

  useEffect(() => {
    if (!mobilePlansSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobilePlansSheetOpen(false);
    };
    window.addEventListener("keydown", onKeydown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeydown);
    };
  }, [mobilePlansSheetOpen]);

  const orderedPlans = useMemo(() => sortPlansByOrder(plans), [plans]);
  const groupedPlans = useMemo(() => groupPlansByDuration(orderedPlans), [orderedPlans]);

  const visiblePlanSections = useMemo(
    () =>
      durationDisplayOrder
        .map((key) => groupedPlans.find((section) => section.key === key))
        .filter(Boolean) as PricingPlanSection[],
    [groupedPlans],
  );

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

  const bestValuePlanEntry = useMemo(() => {
    return (
      groupedPlans.find((section) => section.key === "threeMonth")?.plus ||
      groupedPlans.find((section) => section.key === "yearly")?.plus ||
      recommendedPlanEntry ||
      null
    );
  }, [groupedPlans, recommendedPlanEntry]);

  const stickyCtaEntry = personalizedRecommendation ? recommendedPlanEntry : bestValuePlanEntry;

  return (
    <Box
      className={cn(
        "flex-1 overflow-y-auto bg-[#F4F7FF] px-4 py-0 md:px-8 lg:px-10",
        stickyCtaEntry ? "pb-24 md:pb-0" : "",
      )}
    >
      <Box className="mx-auto w-full max-w-6xl">
        {personalizedRecommendation && recommendedPlanEntry && (
          <Box className="mt-8 rounded-[24px] border border-blue-200 bg-[linear-gradient(90deg,_rgba(74,125,255,0.08)_0%,_rgba(247,157,101,0.08)_100%)] px-5 py-5 shadow-sm">
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

        {orderedPlans.length === 0 && (
          <Box className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50/80 p-6 text-center text-sm text-slate-800 md:p-8 md:text-base">
            <p className="font-semibold text-amber-950">No plans are available right now</p>
            <p className="mt-2 text-slate-700">
              We could not load subscription options. Please try again later or contact support.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              Admins: sync the <span className="font-mono">plans</span> collection into Postgres{" "}
              <span className="font-mono">app_documents</span> (legacy ETL into Postgres), align{" "}
              <span className="font-mono">APP_DOCUMENTS_DB</span> with how rows are keyed, and
              ensure plans are marked active in the CMS.
            </p>
          </Box>
        )}

        {orderedPlans.length > 0 && groupedPlans.length === 0 && (
          <Box className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50/80 p-6 text-center text-sm text-slate-800 md:p-8 md:text-base">
            <p className="font-semibold text-amber-950">We could not match plans to checkout</p>
            <p className="mt-2 text-slate-700">
              Active plans exist but billing periods could not be detected. Check Stripe
              price intervals and plan titles in the CMS, or contact support.
            </p>
          </Box>
        )}

        {groupedPlans.length > 0 && (
          <PricingCheckoutLayout
            id="pricing-style-one"
            className="mb-10"
            plans={plans}
            groupedPlans={groupedPlans}
            pricingCheckoutFields={pricingCheckoutFields}
            recommendedPlanId={recommendedPlanId}
            recommendedSectionKey={recommendedSection?.key ?? null}
            asPageHeading
          />
        )}

      </Box>

        <section
          id="whats-in-plus"
          className="mt-16 py-14 md:py-16"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 md:px-8 lg:flex-row lg:items-start lg:gap-12">
            <div className="min-w-0 flex-1">
              <div className="text-center lg:text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  One full-access tier
                </p>
                <h2 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
                  Everything in Plus
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-600 md:text-lg">
                  Every paid timeline includes the same features — only the billing period
                  changes. Pick Weekly, Monthly, 3-Month, or Yearly based on how long you
                  want to prepare.
                </p>
              </div>
              <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:mx-0 lg:max-w-none">
                {PRICING_PLUS_FEATURE_LABELS.map((label) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <CheckCircle sx={{ color: "#10B981", fontSize: 22 }} aria-hidden />
                    <span className="text-[15px] font-medium text-slate-800">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full shrink-0 lg:max-w-md lg:pt-2">
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm md:px-10 md:py-10">
                <Shield
                  sx={{ fontSize: 48, color: "#10B981" }}
                  className="mx-auto mb-4"
                  aria-hidden
                />
                <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  48-Hour Money-Back Guarantee
                </h2>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Not satisfied? Request a full refund within 48 hours of your first
                  purchase when usage stays within our published caps. See our{" "}
                  <Link href="/refund-policy" className="font-semibold text-blue-700 underline underline-offset-2">
                    Refund Policy
                  </Link>{" "}
                  for full terms.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Success stories
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
                Trusted by CELPIP students
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Students use these practice tools to build familiarity, confidence, and
                consistency before test day.
              </p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {pricingTestimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.name} {...testimonial} />
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="mx-auto max-w-3xl px-4 md:px-8">
            <div className="mb-10 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Common questions
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-slate-600">
                Everything you need to know before getting started.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {pricingFaqs.map((faq) => (
                <FAQItem key={faq.question} {...faq} />
              ))}
            </div>
          </div>
        </section>

      <AnimatePresence>
        {stickyCtaEntry && (
          <motion.div
            key="pricing-mobile-sticky"
            role="region"
            aria-label="Plan quick actions"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 420 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <Box className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <Box className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                  {personalizedRecommendation ? "Recommended" : "Best value"}
                </p>
                <p className="truncate text-sm font-semibold text-blue-950">
                  {stickyCtaEntry.plan.planTitle || stickyCtaEntry.plan.title}
                </p>
                <p className="text-xs text-slate-600">
                  {(() => {
                    const cycle = formatBillingCycle(
                      stickyCtaEntry.plan.billingInterval,
                      stickyCtaEntry.plan.billingIntervalCount
                    );
                    return (
                      <>
                        CA$ {formatPlanCadPrice(stickyCtaEntry.plan.price)}
                        {cycle ? ` · per ${cycle}` : null}
                      </>
                    );
                  })()}
                </p>
              </Box>
              <button
                type="button"
                disabled={groupedPlans.length === 0}
                onClick={() => setMobilePlansSheetOpen(true)}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] px-4 py-2 text-sm font-semibold text-white shadow-md disabled:pointer-events-none disabled:opacity-40"
              >
                <AutoAwesome className="mr-2 h-4 w-4" />
                View plans
              </button>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobilePlansSheetOpen && groupedPlans.length > 0 && (
          <motion.div
            key="pricing-plans-sheet"
            className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.button
              type="button"
              aria-label="Close plan options"
              className="absolute inset-0 border-0 bg-slate-900/45 p-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobilePlansSheetOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pricing-sheet-title"
              className="relative mx-auto flex w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 36, stiffness: 400 }}
              style={{
                maxHeight: "min(85vh, 100dvh - 1.5rem)",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
                <Box className="min-w-0 pr-2">
                  <p id="pricing-sheet-title" className="text-base font-semibold text-blue-950">
                    Choose a plan
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Live catalog from our database — secure checkout on Stripe
                  </p>
                </Box>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setMobilePlansSheetOpen(false)}
                  className="shrink-0 rounded-full p-2 text-slate-600 hover:bg-slate-100"
                >
                  <Close className="h-5 w-5" />
                </button>
              </Box>
              <Box className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
                <PricingModalPlanList
                  plans={plans}
                  sections={visiblePlanSections}
                  recommendedPlanId={recommendedPlanId}
                  recommendedSectionKey={recommendedSection?.key ?? null}
                  pricingCheckoutFields={pricingCheckoutFields}
                />
              </Box>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
