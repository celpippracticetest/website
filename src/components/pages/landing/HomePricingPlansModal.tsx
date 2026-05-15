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
import { v2ButtonVariants } from "@/components/v2/Button";
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

  /** Mobile: stacked cards. lg+: equal-width, equal-height row with bottom-aligned CTAs. */
  const planRowCardClass =
    "flex w-full shrink-0 flex-col self-stretch lg:min-h-0 lg:min-w-[220px] lg:flex-1 lg:basis-0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogDrawerContent
        className={cn(
          "left-0 w-full max-w-none translate-x-0",
          "max-h-[min(90dvh,880px)] min-h-0 border-outline bg-white",
          "flex flex-col gap-0 overflow-hidden"
        )}
      >
        <div className="flex min-h-0 min-w-0 max-h-[min(90dvh,880px)] flex-1 flex-col overflow-hidden">
          <div className="w-full min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-0 pt-6 lg:px-0 lg:pt-12">
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300/90 sm:mt-3"
              aria-hidden
            />
            <div className="shrink-0 border-b border-outline bg-[linear-gradient(180deg,#F4F7FF_0%,#FFFFFF_100%)] px-5 pb-5 pt-0 sm:px-8 sm:pb-6">
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
                  </div>
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex w-full shrink-0 flex-col pt-6 lg:py-4">
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
              const billingHeadline = planBillingHeadline(plan);
              const discountPct = planListDiscountPercent(parsePrice(plan.price), wasNumeric);

                    const planCardDisabled = !plan.stripePriceId || !authLoaded;

                    return (
                <button
                  key={plan._id ?? `${plan.title}-${plan.planTitle}`}
                  type="button"
                  disabled={planCardDisabled}
                  aria-label={`Upgrade to Pro, ${desktopPlanTitle}`}
                  onClick={() => onUpgradePlan(plan.stripePriceId)}
                  className={cn(
                    "relative min-h-0 rounded-2xl border-2 bg-white text-left shadow-sm transition-shadow hover:shadow-md",
                    "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-sm",
                    planRowCardClass,
                    borderClassForPlan(plan, popular),
                    popular && "ring-2 ring-primary1/25"
                  )}
                >
                  {discountPct != null ? (
                    <span
                      className="pointer-events-none absolute -right-1 -top-2 z-[5] max-w-[min(100%,12rem)] truncate rounded-full border border-emerald-200/90 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800 shadow-sm ring-2 ring-white sm:text-[10px] lg:hidden"
                      title={`${discountPct}% off`}
                    >
                      {discountPct}% OFF
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "flex w-full items-center gap-3 p-4 lg:hidden",
                      discountPct != null && "pr-1 sm:pr-14"
                    )}
                  >
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
                    <span
                      aria-hidden
                      className={cn(
                        v2ButtonVariants({ variant: popular ? "primary" : "secondary", size: "sm" }),
                        "pointer-events-none shrink-0 px-3"
                      )}
                    >
                      Upgrade
                    </span>
                  </div>

                  <div className="hidden min-h-0 flex-1 flex-col p-5 sm:p-6 lg:flex">
                    <div className="mb-4 shrink-0 text-center">
                      <h3 className="text-lg font-bold text-text1">{desktopPlanTitle}</h3>
                    </div>

                    <div className="mb-4 min-h-[5.25rem] shrink-0 text-center">
                      {showWas ? (
                        <p className="mb-1 text-sm font-medium tabular-nums text-red-600 line-through">
                          Was CA$ {formatPlanCadPrice(wasAmountStr)}
                        </p>
                      ) : (
                        <p className="mb-1 text-sm invisible" aria-hidden>
                          &nbsp;
                        </p>
                      )}
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

                    <ul className="mb-4 flex min-h-0 flex-1 flex-col gap-2.5 text-sm text-text2">
                      {PRICING_PLUS_FEATURE_LABELS.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <span
                      aria-hidden
                      className={cn(
                        v2ButtonVariants({ variant: popular ? "primary" : "secondary" }),
                        "pointer-events-none mt-auto h-[40px] w-full shrink-0 justify-center text-center text-[14px]"
                      )}
                    >
                      Upgrade to Pro
                    </span>
                  </div>
                </button>
                  );
                  })}
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-outline bg-white px-5 py-4 text-center sm:px-8">
            <p className="text-sm text-text2">
              Want the full comparison, FAQs, and checkout?{" "}
              <Link href="/pricing" className="font-semibold text-primary1 underline-offset-2 hover:underline">
                View all pricing details
              </Link>
            </p>
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
