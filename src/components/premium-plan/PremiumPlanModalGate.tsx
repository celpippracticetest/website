"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import useStore from "@/store";

const PremiumPlanModal = dynamic(
  () => import("@/components/premium-plan/PremiumPlanModal"),
  { ssr: false },
);

export default function PremiumPlanModalGate() {
  const isOpen = useStore((state) => state.isPremiumPlanModalOpen);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (isOpen) setShouldLoad(true);
  }, [isOpen]);

  if (!shouldLoad) return null;
  return <PremiumPlanModal />;
}
