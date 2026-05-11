"use client";

import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Crown, Gem, Zap, type LucideIcon } from "lucide-react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  Dialog,
  DialogDrawerContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/v2/Button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildOriginalPriceFromWeeklyMap,
  formatBillingCycle,
  formatPlanCadPrice,
  getStablePlanId,
  parsePrice,
  PRICING_PLUS_FEATURE_LABELS,
} from "@/lib/pricing";
import {
  pricingUpgradeOfferBody,
  pricingUpgradeOfferTitle,
  pricingUpgradeOfferTrustLine,
  pricingUpgradeUnlockHeading,
} from "@/components/pages/pricing/pricingContent";
import { cn } from "@/lib/utils";
import type { SerializedPlan } from "@/types/pricing";

const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim();

function iconForPlan(plan: SerializedPlan): LucideIcon {
  if (plan.iconType === "BestValuePlan") return Gem;
  if (plan.iconType === "PopularPlan") return Crown;
  return Zap;
}

function isPopularPlan(plan: SerializedPlan): boolean {
  if (plan.iconType === "PopularPlan") return true;
  const t = `${plan.type} ${plan.title}`.toLowerCase();
  return (
    /\bpopular\b/.test(t) ||
    /\bbest seller\b/.test(t) ||
    /\bbest value\b/.test(t) ||
    /\bmost popular\b/.test(t)
  );
}

function borderClassForPlan(plan: SerializedPlan, popular: boolean): string {
  if (popular) return "border-primary1";
  if (plan.iconType === "BestValuePlan") return "border-text1";
  return "border-outline";
}

function isQuarterlyBilling(plan: SerializedPlan): boolean {
  return plan.billingInterval === "month" && (plan.billingIntervalCount ?? 1) === 3;
}

/** Short billing label for compact rows (e.g. Monthly, Weekly, Quarterly). */
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

/** Weekly-derived baseline when available; otherwise CMS `oldPrice`. */
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

  /** Mobile: centered column inside max-w-5xl. lg+: row that wraps (no inner scroll). */
  const planRowCardClass = "w-full shrink-0 lg:min-w-[220px] lg:flex-1 lg:basis-0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogDrawerContent
        className={cn(
          "max-h-[min(90dvh,880px)] min-h-0 border-outline bg-white",
          "gap-0 overflow-x-hidden overflow-y-auto"
        )}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300/90 sm:mt-3"
          aria-hidden
        />
        <div className="shrink-0 border-b border-outline bg-[linear-gradient(180deg,#F4F7FF_0%,#FFFFFF_100%)] px-5 pb-5 pt-4 sm:px-8 sm:pb-6 sm:pt-6">
          <DialogHeader className="space-y-4 text-left">
            <DialogTitle className="text-2xl font-bold leading-tight text-text1 sm:text-3xl">
              {pricingUpgradeOfferTitle}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-left text-base leading-relaxed text-text2">
                <p className="text-sm font-semibold text-text1">{pricingUpgradeOfferTrustLine}</p>
                {GOOGLE_REVIEWS_URL ? (
                  <p className="text-sm text-text2">
                    Loved by learners —{" "}
                    <a
                      href={GOOGLE_REVIEWS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary1 underline-offset-2 hover:underline"
                    >
                      Read reviews on Google
                    </a>
                    .
                  </p>
                ) : null}
                <p>{pricingUpgradeOfferBody}</p>
                <div>
                  <p className="font-semibold text-text1">{pricingUpgradeUnlockHeading}</p>
                  <ul className="mt-2 grid list-none gap-1.5 text-sm">
                    {PRICING_PLUS_FEATURE_LABELS.map((label) => (
                      <li key={label} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                        <span>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          className={cn(
            "flex w-full shrink-0 flex-col",
            "pt-6 lg:px-0 lg:py-4 lg:pt-12"
          )}
        >
          <div
            className={cn(
              "mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 p-4 sm:p-5",
              "lg:mb-10 lg:flex-row lg:flex-wrap lg:items-stretch lg:justify-center lg:gap-8"
            )}
          >
          {loading && (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl border-2 border-outline bg-white",
                    planRowCardClass
                  )}
                >
                  <div className="flex w-full items-center gap-3 p-4 lg:hidden">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-14 shrink-0 rounded-full" />
                    <div className="shrink-0 space-y-1 text-right">
                      <Skeleton className="ml-auto h-4 w-16" />
                      <Skeleton className="ml-auto h-3 w-12" />
                    </div>
                    <Skeleton className="h-9 w-[5.5rem] shrink-0 rounded-lg" />
                  </div>
                  <div className="hidden flex-1 flex-col gap-3 p-5 sm:p-6 lg:flex">
                    <Skeleton className="mx-auto h-11 w-11 rounded-xl" />
                    <Skeleton className="mx-auto h-6 w-[75%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[83%]" />
                  </div>
                </div>
              ))}
            </>
          )}

          {!loading && loadError && (
            <div className="w-full min-w-0 shrink-0 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-6 text-center text-sm text-text2">
              Plans could not be loaded.{" "}
              <Link href="/pricing" className="font-semibold text-primary1 underline-offset-2 hover:underline">
                Open the pricing page
              </Link>{" "}
              to subscribe.
            </div>
          )}

          {!loading && !loadError && sortedPlans.length === 0 && (
            <div className="w-full min-w-0 shrink-0 rounded-2xl border border-outline px-4 py-6 text-center text-sm text-text2">
              No active plans are available right now.{" "}
              <Link href="/pricing" className="font-semibold text-primary1 underline-offset-2 hover:underline">
                Check pricing
              </Link>
              .
            </div>
          )}

          {!loading &&
            !loadError &&
            sortedPlans.map((plan, planIndex) => {
              const Icon = iconForPlan(plan);
              const popular = isPopularPlan(plan);
              const cycle = formatBillingCycle(plan.billingInterval, plan.billingIntervalCount);
              const { show: showWas, amountStr: wasAmountStr } = resolveWasPriceForPlan(
                plan,
                planIndex,
                weeklyBaselineWasByPlanId
              );
              const wasNumeric = showWas ? parsePrice(wasAmountStr) : 0;
              const displayName = plan.planTitle?.trim() || plan.title?.trim() || "Plan";
              const desktopPlanTitle = isQuarterlyBilling(plan) ? "Quarterly" : displayName;
              const mobileSecondLine =
                isQuarterlyBilling(plan) && /^\s*3\s*months?\s*$/i.test(displayName)
                  ? (plan.type?.trim() || plan.title?.trim() || displayName)
                  : displayName;
              const featureRows = plan.features.slice(0, 8);
              const billingHeadline = planBillingHeadline(plan);
              const discountPct = planListDiscountPercent(parsePrice(plan.price), wasNumeric);

              return (
                <div
                  key={plan._id ?? `${plan.title}-${plan.planTitle}`}
                  className={cn(
                    "relative flex min-h-0 flex-col rounded-2xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md lg:h-full",
                    planRowCardClass,
                    borderClassForPlan(plan, popular),
                    popular && "ring-2 ring-primary1/25 lg:scale-[1.02]"
                  )}
                >
                  <div className="flex w-full items-center gap-3 p-4 lg:hidden">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary5",
                        popular && "ring-1 ring-primary1/30"
                      )}
                      aria-hidden
                    >
                      {popular ? (
                        <Crown className="h-4 w-4 text-primary1" />
                      ) : (
                        <Icon className="h-4 w-4 text-primary1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-text1">{billingHeadline}</div>
                      <div className="truncate text-xs text-text2">{mobileSecondLine}</div>
                    </div>
                    {discountPct != null ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-emerald-800 ring-1 ring-emerald-200/80 sm:px-2 sm:text-[10px]">
                        {discountPct}% OFF
                      </span>
                    ) : null}
                    <div className="shrink-0 text-right leading-tight">
                      {showWas ? (
                        <div className="whitespace-nowrap text-xs font-medium tabular-nums text-red-600 line-through">
                          Was CA$ {formatPlanCadPrice(wasAmountStr)}
                        </div>
                      ) : null}
                      <div className="whitespace-nowrap text-base font-bold tabular-nums text-text1">
                        CA$ {formatPlanCadPrice(plan.price)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 px-3"
                      variant={popular ? "primary" : "secondary"}
                      disabled={!plan.stripePriceId || !authLoaded}
                      onClick={() => onUpgradePlan(plan.stripePriceId)}
                    >
                      Upgrade
                    </Button>
                  </div>

                  <div className="hidden min-h-0 flex-1 flex-col p-5 sm:p-6 lg:flex lg:h-full">
                    <div className="mb-4 text-center">
                      <h3 className="text-lg font-bold text-text1">{desktopPlanTitle}</h3>
                    </div>

                    <div className="mb-4 text-center">
                      {showWas ? (
                        <p className="mb-1 text-sm font-medium tabular-nums text-red-600 line-through">
                          Was CA$ {formatPlanCadPrice(wasAmountStr)}
                        </p>
                      ) : null}
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm text-text2">CAD</span>
                        <span className="text-3xl font-bold text-text1">{formatPlanCadPrice(plan.price)}</span>
                      </div>
                      <div className="mt-1 text-sm text-text2">
                        {isQuarterlyBilling(plan) ? (
                          <>per quarter</>
                        ) : cycle ? (
                          <>per {cycle}</>
                        ) : (
                          <>per billing period</>
                        )}
                      </div>
                    </div>

                    {featureRows.length > 0 ? (
                      <ul className="mb-4 flex min-h-0 flex-1 flex-col gap-2.5 text-sm text-text2">
                        {featureRows.map((feature) => (
                          <li key={feature} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="min-h-0 flex-1" aria-hidden />
                    )}

                    <Button
                      type="button"
                      size="sm"
                      className="mt-auto w-full shrink-0"
                      variant={popular ? "primary" : "secondary"}
                      disabled={!plan.stripePriceId || !authLoaded}
                      onClick={() => onUpgradePlan(plan.stripePriceId)}
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-outline px-5 py-4 text-center sm:px-8">
          <p className="text-sm text-text2">
            Want the full comparison, FAQs, and checkout?{" "}
            <Link href="/pricing" className="font-semibold text-primary1 underline-offset-2 hover:underline">
              View all pricing details
            </Link>
          </p>
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
