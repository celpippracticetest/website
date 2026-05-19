"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Bolt, Zap } from "lucide-react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  Dialog,
  DialogDrawerContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildOriginalPriceFromWeeklyMap,
  formatPlanCadPrice,
  getStablePlanId,
  isThreeMonthPlan,
  parsePrice,
} from "@/lib/pricing";
import { PricingUpgradeModalHeaderList } from "@/components/pages/pricing/PricingUpgradeModalHeaderList";
import {
  pricingUpgradeModalHighlights,
  pricingUpgradeOfferTitle,
} from "@/components/pages/pricing/pricingContent";
import { cn } from "@/lib/utils";
import type { SerializedPlan } from "@/types/pricing";

function isPopularPlan(plan: SerializedPlan): boolean {
  if (isThreeMonthPlan(plan) || plan.iconType === "BestValuePlan") return false;
  if (plan.iconType === "PopularPlan") return true;
  const t = `${plan.type} ${plan.title}`.toLowerCase();
  return (
    /\bpopular\b/.test(t) ||
    /\bbest seller\b/.test(t) ||
    /\bbest value\b/.test(t) ||
    /\bmost popular\b/.test(t)
  );
}

function planBillingHeadline(plan: SerializedPlan): string {
  const interval = plan.billingInterval;
  const count =
    plan.billingIntervalCount && plan.billingIntervalCount > 0 ? plan.billingIntervalCount : 1;
  if (!interval) return plan.planTitle?.trim() || plan.title?.trim() || "Plan";
  if (count === 1) {
    if (interval === "day") return "Daily";
    if (interval === "week") return "Weekly";
    if (interval === "month") return "Monthly";
    if (interval === "year") return "Yearly";
    return interval;
  }
  if (interval === "month" && count === 3) return "Quarterly";
  return `${count} ${interval}s`;
}

function planListDiscountPercent(currentPrice: number, wasPrice: number): number | null {
  if (wasPrice <= 0 || currentPrice <= 0 || wasPrice <= currentPrice) return null;
  return Math.round(((wasPrice - currentPrice) / wasPrice) * 100);
}

function resolveWasPriceForPlan(
  plan: SerializedPlan,
  planIndex: number,
  weeklyBaselineById: Map<string, string>
): { show: boolean; amountStr: string } {
  const current = parsePrice(plan.price);
  const stableId = getStablePlanId(plan, planIndex);
  const fromWeekly = weeklyBaselineById.get(stableId);
  if (fromWeekly != null) {
    const was = parsePrice(fromWeekly);
    if (was > current) {
      return { show: true, amountStr: fromWeekly };
    }
  }
  const cmsOld = parsePrice(plan.oldPrice);
  if (cmsOld > current) {
    return { show: true, amountStr: plan.oldPrice };
  }
  return { show: false, amountStr: "" };
}

export type HomePricingPlansModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function HomePricingPlansModalInner({ open, onOpenChange }: HomePricingPlansModalProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useHybridWebUser();
  const attribution = useCheckoutAttributionPayload();
  const [catalogPlans, setCatalogPlans] = useState<SerializedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const submitSignedInStripeCheckout = useCallback(
    (stripePriceId: string) => {
      const checkoutAction = `/api/checkout_session?price=${encodeURIComponent(stripePriceId)}`;
      const form = document.createElement("form");
      form.method = "POST";
      form.action = checkoutAction;
      const add = (name: string, value: string) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };
      for (const [key, value] of Object.entries(mergePendingGa4IntoAttribution(attribution))) {
        add(key, value);
      }
      document.body.appendChild(form);
      form.submit();
    },
    [attribution]
  );

  const onUpgradePlan = useCallback(
    (stripePriceId: string | undefined) => {
      if (!stripePriceId || !authLoaded) return;
      if (!isSignedIn) {
        const returnPath = `/api/checkout_session?price=${encodeURIComponent(stripePriceId)}`;
        onOpenChange(false);
        router.push(`/sign-in?redirect_url=${encodeURIComponent(returnPath)}`);
        return;
      }
      submitSignedInStripeCheckout(stripePriceId);
    },
    [authLoaded, isSignedIn, onOpenChange, router, submitSignedInStripeCheckout]
  );

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

  const sortedPlans = useMemo(() => {
    return [...catalogPlans].sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.order ?? Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });
  }, [catalogPlans]);

  const weeklyBaselineWasByPlanId = useMemo(
    () => buildOriginalPriceFromWeeklyMap(sortedPlans),
    [sortedPlans]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogDrawerContent
        className={cn(
          "left-0 w-full max-w-none translate-x-0",
          "max-h-[min(88dvh,720px)] min-h-0 border-outline bg-[#FAFBFF] p-0",
          "flex flex-col gap-0 overflow-hidden"
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <header className="border-b border-outline px-5 pb-5 pr-12 pt-3 sm:px-8 sm:pr-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300/90" aria-hidden />
            <DialogTitle className="mb-2 border-0 p-0 text-xl font-bold leading-tight text-text1 sm:text-2xl">
              {pricingUpgradeOfferTitle}
            </DialogTitle>
            <DialogDescription asChild>
              <PricingUpgradeModalHeaderList
                itemTextClassName="text-text2"
                emphasisTextClassName="font-semibold text-text1"
                iconWrapClassName="bg-primary5 text-primary1"
                linkClassName="text-primary1"
              />
            </DialogDescription>
          </header>

          <div className="px-4 py-4 sm:px-6">
            <div
              className={cn(
                "mx-auto grid w-full max-w-4xl gap-3",
                sortedPlans.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "max-w-sm"
              )}
            >
              {loading &&
                [0, 1, 2].map((i) => (
                  <div key={i} className="rounded-2xl border-2 border-outline bg-white p-4">
                    <Skeleton className="mb-3 h-5 w-24" />
                    <Skeleton className="mb-4 h-8 w-20 ml-auto" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                  </div>
                ))}

              {!loading && loadError && (
                <p className="col-span-full rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-6 text-center text-sm text-text2">
                  Plans could not be loaded.{" "}
                  <Link href="/pricing" className="font-semibold text-primary1 hover:underline">
                    Open pricing
                  </Link>
                </p>
              )}

              {!loading && !loadError && sortedPlans.length === 0 && (
                <p className="col-span-full text-center text-sm text-text2">
                  No active plans.{" "}
                  <Link href="/pricing" className="font-semibold text-primary1 hover:underline">
                    View pricing
                  </Link>
                </p>
              )}

              {!loading &&
                !loadError &&
                sortedPlans.map((plan, planIndex) => {
                  const popular = isPopularPlan(plan);
                  const isRec = isThreeMonthPlan(plan) || plan.iconType === "BestValuePlan";
                  const { show: showWas, amountStr: wasAmountStr } = resolveWasPriceForPlan(
                    plan,
                    planIndex,
                    weeklyBaselineWasByPlanId
                  );
                  const wasNumeric = showWas ? parsePrice(wasAmountStr) : 0;
                  const billingHeadline = planBillingHeadline(plan);
                  const discountPct = planListDiscountPercent(parsePrice(plan.price), wasNumeric);
                  const planCardDisabled = !plan.stripePriceId || !authLoaded;
                  return (
                    <button
                      key={plan._id ?? `${plan.title}-${plan.planTitle}`}
                      type="button"
                      disabled={planCardDisabled}
                      aria-label={`Get Plus, ${billingHeadline}, CA$ ${formatPlanCadPrice(plan.price)}`}
                      onClick={() => onUpgradePlan(plan.stripePriceId)}
                      className={cn(
                        "relative flex flex-col rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all",
                        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        isRec ? "border-amber-400/70 shadow-amber-100/80" : "border-outline",
                        popular && !isRec && "ring-2 ring-primary1/20"
                      )}
                    >
                      <div className="mb-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary5",
                                popular && "ring-1 ring-primary1/30"
                              )}
                              aria-hidden
                            >
                              <Zap className="h-4 w-4 text-primary1" />
                            </span>
                            <span className="text-base font-bold text-text1">{billingHeadline}</span>
                          </div>
                          {discountPct != null ? (
                            <p className="mt-0.5 pl-10 text-xs font-bold text-emerald-600">
                              Save {discountPct}%
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          {showWas ? (
                            <p className="text-xs text-text2 line-through tabular-nums">
                              CA$ {formatPlanCadPrice(wasAmountStr)}
                            </p>
                          ) : null}
                          <p className="text-xl font-extrabold tabular-nums text-text1">
                            CA$ {formatPlanCadPrice(plan.price)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold",
                          isRec
                            ? "bg-gradient-to-r from-amber-500 to-amber-400 text-[#1B2B5A]"
                            : popular
                              ? "bg-primary1 text-white"
                              : "bg-slate-800 text-white"
                        )}
                      >
                        <Bolt className="h-4 w-4" aria-hidden />
                        Get Plus
                      </span>
                    </button>
                  );
                })}
            </div>

            {!loading && !loadError && sortedPlans.length > 0 ? (
              <>
                <p className="mx-auto mt-4 max-w-lg text-center text-xs text-text2">
                  {pricingUpgradeModalHighlights.join(" · ")}
                </p>
                <p className="mx-auto mt-2 text-center text-xs font-semibold text-emerald-700">
                  48-hour money-back guarantee · 2 devices · Cancel anytime
                </p>
              </>
            ) : null}
          </div>

          <footer className="border-t border-outline bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center sm:px-8">
            <Link
              href="/pricing"
              className="text-sm font-semibold text-primary1 underline-offset-2 hover:underline"
            >
              Compare plans &amp; FAQs
            </Link>
          </footer>
          </div>
        </div>
      </DialogDrawerContent>
    </Dialog>
  );
}

export function HomePricingPlansModal(props: HomePricingPlansModalProps) {
  return (
    <Suspense fallback={null}>
      <HomePricingPlansModalInner {...props} />
    </Suspense>
  );
}
