"use client";

import useStore from "@/store";
import { PremiumPaywallOverlay } from "@/components/premium-plan/PremiumPaywallOverlay";

const PremiumPlanModal = () => {
  const isOpen = useStore((state) => state.isPremiumPlanModalOpen);
  const close = useStore((state) => state.closePremiumPlanModal);

  return (
    <PremiumPaywallOverlay
      open={isOpen}
      onClose={close}
      triggerSource="premium_plan_modal"
    />
  );
};

export default PremiumPlanModal;
