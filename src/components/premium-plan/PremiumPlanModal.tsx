"use client";

import React, { useEffect, useMemo } from "react";
import useStore from "@/store";
import { X } from "lucide-react";
import { usePlans } from "@/hooks/usePlans";
import { motion, AnimatePresence } from "framer-motion";
import { PricingBrandHeader } from "@/components/pages/pricing/brand/PricingBrandHeader";
import { PricingBrandPlansSection } from "@/components/pages/pricing/brand/PricingBrandPlansSection";
import { PricingBrandPartnersSection } from "@/components/pages/pricing/brand/PricingBrandPartnersSection";
import { PricingBrandReviewsSection } from "@/components/pages/pricing/brand/PricingBrandReviewsSection";
import { PricingBrandFaqSection } from "@/components/pages/pricing/brand/PricingBrandFaqSection";
import type { SerializedPlan } from "@/types/pricing";
import { trackKpi } from "@/lib/analytics";

function toSerializedPlans(plans: unknown[]): SerializedPlan[] {
  return plans.map((raw) => {
    const plan = raw as Record<string, unknown>;
    return {
      _id: typeof plan._id === "string" ? plan._id : undefined,
      title: String(plan.title ?? ""),
      type: String(plan.type ?? ""),
      planTitle: String(plan.planTitle ?? plan.title ?? ""),
      oldPrice: String(plan.oldPrice ?? ""),
      price: String(plan.price ?? ""),
      discount: String(plan.discount ?? ""),
      buttonTitle: String(plan.buttonTitle ?? "Get Premium"),
      features: Array.isArray(plan.features) ? plan.features.map(String) : [],
      billingInterval:
        plan.billingInterval as SerializedPlan["billingInterval"],
      billingIntervalCount:
        typeof plan.billingIntervalCount === "number"
          ? plan.billingIntervalCount
          : undefined,
      stripeProductId:
        typeof plan.stripeProductId === "string"
          ? plan.stripeProductId
          : undefined,
      stripePriceId:
        typeof plan.stripePriceId === "string" ? plan.stripePriceId : undefined,
      iconType: plan.iconType as SerializedPlan["iconType"],
      iconWrapperColor:
        typeof plan.iconWrapperColor === "string"
          ? plan.iconWrapperColor
          : undefined,
      order: typeof plan.order === "number" ? plan.order : undefined,
    };
  });
}

const PremiumPlanModal = () => {
  const { isPremiumPlanModalOpen, setPremiumPlanModalState } = useStore();
  const { plans, isLoading } = usePlans();

  const serializedPlans = useMemo(() => toSerializedPlans(plans), [plans]);

  useEffect(() => {
    if (isPremiumPlanModalOpen) {
      document.body.style.overflow = "hidden";
      trackKpi.paywallView({
        triggerSource: "premium_plan_modal",
        plansShown: serializedPlans.length,
      });
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isPremiumPlanModalOpen, serializedPlans.length]);

  return (
    <AnimatePresence>
      {isPremiumPlanModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-black/60 p-0 backdrop-blur-sm"
          onClick={() => setPremiumPlanModalState()}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#eef2f8] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPremiumPlanModalState()}
              className="absolute top-4 right-4 z-20 rounded-full bg-white p-2 shadow-md transition-colors hover:bg-gray-100"
              aria-label="Close pricing"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-10 screen744:px-10">
              <div className="mx-auto flex w-full max-w-[1060px] flex-col items-center">
                <PricingBrandHeader titleTag="h2" />

                {isLoading ? (
                  <p className="mt-10 text-sm text-[#5b6575]">Loading plans…</p>
                ) : serializedPlans.length === 0 ? (
                  <p className="mt-10 text-sm text-[#5b6575]">
                    Plans are unavailable right now. Please try again later.
                  </p>
                ) : (
                  <PricingBrandPlansSection
                    plans={serializedPlans}
                    featuredPlan="Monthly"
                    showPerWeek
                  />
                )}

                <PricingBrandPartnersSection />

                <PricingBrandReviewsSection />

                <div className="mt-14 w-full">
                  <PricingBrandFaqSection />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumPlanModal;
