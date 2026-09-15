"use client";

import { PremiumPaywallOverlay } from "@/components/premium-plan/PremiumPaywallOverlay";

type UpgradeModalProps = {
  setShowModal: (show: boolean) => void;
  triggerSource?: string;
};

const UpgradeModal = ({ setShowModal, triggerSource }: UpgradeModalProps) => {
  return (
    <PremiumPaywallOverlay
      open
      onClose={() => setShowModal(false)}
      triggerSource={triggerSource || "upgrade_modal"}
    />
  );
};

export default UpgradeModal;
