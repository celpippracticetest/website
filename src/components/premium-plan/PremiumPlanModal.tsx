"use client";

import React, { useEffect, useMemo } from "react";
import useStore from "@/store";
import { usePlans } from "@/hooks/usePlans";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumPaywallDialog } from "@/components/premium-plan/PremiumPaywallDialog";
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
      currency: typeof plan.currency === "string" ? plan.currency : undefined,
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
  const close = () => setPremiumPlanModalState();

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
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#17161680] p-4 backdrop-blur-[6px] screen744:p-8"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="my-auto w-full max-w-[880px]"
            onClick={(e) => e.stopPropagation()}
          >
            <PremiumPaywallDialog
              plans={serializedPlans}
              isLoading={isLoading}
              onClose={close}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PremiumPlanModal;
