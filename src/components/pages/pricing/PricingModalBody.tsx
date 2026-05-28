"use client";

import Link from "next/link";
import { PricingModalHero } from "@/components/pages/pricing/PricingModalHero";
import { PricingModalPlanList } from "@/components/pages/pricing/PricingModalPlanList";
import { Skeleton } from "@/components/ui/skeleton";
import { durationDisplayOrder } from "@/lib/pricingCatalog";
import type { PricingPlanSection } from "@/lib/pricingPlanSections";
import type { DurationGroupKey, SerializedPlan } from "@/types/pricing";

type PricingModalBodyProps = {
  loading: boolean;
  loadError: boolean;
  orderedPlanCount?: number;
  plans: SerializedPlan[];
  groupedPlans: PricingPlanSection[];
  recommendedPlanId: string | null;
  recommendedSectionKey: DurationGroupKey | null;
  onClose: () => void;
};

export function PricingModalBody({
  loading,
  loadError,
  orderedPlanCount = 0,
  plans,
  groupedPlans,
  recommendedPlanId,
  recommendedSectionKey,
  onClose,
}: PricingModalBodyProps) {
  const visibleSections = durationDisplayOrder
    .map((key) => groupedPlans.find((section) => section.key === key))
    .filter(Boolean) as PricingPlanSection[];

  const showPlanList = !loading && !loadError && groupedPlans.length > 0;

  return (
    <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-center gap-6 lg:mb-10 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full lg:w-1/2">
          <PricingModalHero align="left" />
        </div>

        <div className="w-full lg:w-1/2">
          {loading ? (
            <div className="flex w-full flex-col gap-2.5 lg:gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-14 w-full rounded-2xl" />
              ))}
            </div>
          ) : null}

          {!loading && loadError ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-6 text-center text-sm text-slate-700">
              Plans could not be loaded.{" "}
              <Link
                href="/pricing"
                className="font-semibold text-blue-700 hover:underline"
                onClick={onClose}
              >
                Open pricing page
              </Link>
            </p>
          ) : null}

          {!loading && !loadError && orderedPlanCount > 0 && groupedPlans.length === 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-6 text-center text-sm text-slate-700">
              We could not match plans to checkout.{" "}
              <Link
                href="/pricing"
                className="font-semibold text-blue-700 hover:underline"
                onClick={onClose}
              >
                Open pricing page
              </Link>
            </p>
          ) : null}

          {!loading && !loadError && orderedPlanCount === 0 && groupedPlans.length === 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-6 text-center text-sm text-slate-700">
              No active plans right now.{" "}
              <Link
                href="/pricing"
                className="font-semibold text-blue-700 hover:underline"
                onClick={onClose}
              >
                View pricing
              </Link>
            </p>
          ) : null}

          {showPlanList ? (
            <PricingModalPlanList
              plans={plans}
              sections={visibleSections}
              recommendedPlanId={recommendedPlanId}
              recommendedSectionKey={recommendedSectionKey}
            />
          ) : null}
        </div>
      </div>

      {showPlanList ? (
        <div className="mx-auto mt-6 max-w-lg text-center">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
            onClick={onClose}
          >
            Compare plans &amp; FAQs
          </Link>
          <p className="mt-2 text-sm text-slate-500">
            <Link
              href="/practice-overview"
              className="font-medium text-slate-600 hover:text-slate-900"
              onClick={onClose}
            >
              Continue with free practice
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
