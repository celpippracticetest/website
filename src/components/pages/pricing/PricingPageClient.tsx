"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import CheckCircle from "@mui/icons-material/CheckCircle";
import ChevronDown from "@mui/icons-material/KeyboardArrowDown";
import ChevronUp from "@mui/icons-material/KeyboardArrowUp";
import Star from "@mui/icons-material/Star";
import { PricingCheckoutLayout } from "@/components/pages/pricing/PricingCheckoutLayout";
import { PricingMoneyBackGuaranteeCard } from "@/components/pages/pricing/PricingMoneyBackGuaranteeCard";
import {
  pricingFaqs,
  pricingTestimonials,
} from "@/components/pages/pricing/pricingContent";
import { Box } from "@/components/ui/Box";
import { useEngagementTracking } from "@/hooks/useTracking";
import {
  PRICING_PLUS_FEATURE_LABELS,
} from "@/lib/pricing";
import { groupPlansByDuration, sortPlansByOrder } from "@/lib/pricingPlanSections";
import { durationDisplayOrder } from "@/lib/pricingCatalog";
import type { PricingAbLayout } from "@/lib/pricingAbTest";
import type { PricingFaq, SerializedPlan } from "@/types/pricing";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
const avatarSources = ["Carlos.png", "Li.png", "Tatiana.png"];

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

  const orderedPlans = useMemo(() => sortPlansByOrder(plans), [plans]);
  const groupedPlans = useMemo(() => groupPlansByDuration(orderedPlans), [orderedPlans]);

  const visiblePlanSections = useMemo(
    () =>
      durationDisplayOrder
        .map((key) => groupedPlans.find((section) => section.key === key))
        .filter(Boolean) as PricingPlanSection[],
    [groupedPlans],
  );

  const recommendedSection = useMemo(
    () =>
      groupedPlans.find((section) => section.key === "threeMonth") ||
      groupedPlans.find((section) => section.key === "monthly") ||
      groupedPlans[0] ||
      null,
    [groupedPlans]
  );

  const recommendedPlanEntry = useMemo(() => {
    if (!recommendedSection) {
      return null;
    }

    return recommendedSection.plus || null;
  }, [recommendedSection]);

  const recommendedPlanId = recommendedPlanEntry?.stableId || null;

  return (
    <Box className="flex-1 overflow-y-auto bg-[#F4F7FF] px-4 py-0 md:px-8 lg:px-10">
      <Box className="mx-auto w-full max-w-6xl">
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
                  Everything in Pro
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
              <PricingMoneyBackGuaranteeCard />
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
    </Box>
  );
}
