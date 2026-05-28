"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { PricingModalBody } from "@/components/pages/pricing/PricingModalBody";
import { PricingUrgencyBanner } from "@/components/pages/pricing/PricingUrgencyBanner";
import {
  Dialog,
  DialogDrawerContent,
} from "@/components/ui/dialog";
import { groupPlansByDuration, sortPlansByOrder } from "@/lib/pricingPlanSections";
import { cn } from "@/lib/utils";
import type { SerializedPlan } from "@/types/pricing";

export type PricingNavModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PricingNavModalInner({ open, onOpenChange }: PricingNavModalProps) {
  const [catalogPlans, setCatalogPlans] = useState<SerializedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void fetch("/api/plans/catalog")
      .then(async (r) => {
        const data = (await r.json()) as { plans?: SerializedPlan[]; error?: string };
        if (!r.ok) throw new Error(data.error ?? "request failed");
        if (!cancelled) setCatalogPlans(Array.isArray(data.plans) ? data.plans : []);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setCatalogPlans([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const orderedPlans = useMemo(() => sortPlansByOrder(catalogPlans), [catalogPlans]);
  const groupedPlans = useMemo(() => groupPlansByDuration(orderedPlans), [orderedPlans]);

  const recommendedSectionKey = useMemo(() => {
    return (
      groupedPlans.find((section) => section.key === "threeMonth")?.key ??
      groupedPlans.find((section) => section.key === "monthly")?.key ??
      groupedPlans[0]?.key ??
      null
    );
  }, [groupedPlans]);

  const recommendedPlanId = useMemo(() => {
    const section = groupedPlans.find((entry) => entry.key === recommendedSectionKey);
    return section?.plus?.stableId ?? null;
  }, [groupedPlans, recommendedSectionKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogDrawerContent
        className={cn(
          "left-0 flex w-full max-w-none translate-x-0 flex-col border-slate-200/90 bg-[#F4F7FF] p-0",
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
            <div className="px-4 pt-4 sm:px-6">
              <div className="mx-auto max-w-5xl">
                <PricingUrgencyBanner />
              </div>
            </div>

            <PricingModalBody
              loading={loading}
              loadError={loadError}
              orderedPlanCount={orderedPlans.length}
              plans={orderedPlans}
              groupedPlans={groupedPlans}
              recommendedPlanId={recommendedPlanId}
              recommendedSectionKey={recommendedSectionKey}
              onClose={() => onOpenChange(false)}
            />
          </div>
        </div>
      </DialogDrawerContent>
    </Dialog>
  );
}

export function PricingNavModal(props: PricingNavModalProps) {
  return (
    <Suspense fallback={null}>
      <PricingNavModalInner {...props} />
    </Suspense>
  );
}
