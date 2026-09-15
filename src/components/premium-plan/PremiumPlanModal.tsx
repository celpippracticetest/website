"use client";

import useStore from "@/store";
import { PremiumPaywallOverlay } from "@/components/premium-plan/PremiumPaywallOverlay";

const PremiumPlanModal = () => {
  const isOpen = useStore((state) => state.isPremiumPlanModalOpen);
  const toggle = useStore((state) => state.setPremiumPlanModalState);

  return (
    <PremiumPaywallOverlay
      open={isOpen}
      onClose={toggle}
      triggerSource="premium_plan_modal"
    />
  );
};

export default PremiumPlanModal;
