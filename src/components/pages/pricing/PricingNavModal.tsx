"use client";

import BoltIcon from "@mui/icons-material/Bolt";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import { PricingUpgradeModalHeaderList } from "@/components/pages/pricing/PricingUpgradeModalHeaderList";
import {
  pricingUpgradeModalHighlights,
  pricingUpgradeOfferTitle,
} from "@/components/pages/pricing/pricingContent";
import {
  Dialog,
  DialogDescription,
  DialogDrawerContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mergePendingGa4IntoAttribution } from "@/lib/ga4BrowserIds";
import {
  buildOriginalPriceFromWeeklyMap,
  formatPlanCadPrice,
  getStablePlanId,
  isThreeMonthPlan,
  parsePrice,
} from "@/lib/pricing";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import { useRecentSignupsLiveStat } from "@/hooks/useRecentSignupsLiveStat";
import type { SerializedPlan } from "@/types/pricing";

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

const PLAN_ACCENT_BLUE = "#2563EB";

function accentForPlan(_plan: SerializedPlan): string {
  return PLAN_ACCENT_BLUE;
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

export type PricingNavModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function PricingNavModalInner({ open, onOpenChange }: PricingNavModalProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useHybridWebUser();
  const attribution = useCheckoutAttributionPayload();

  const [catalogPlans, setCatalogPlans] = useState<SerializedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { display: signupDisplay } = useRecentSignupsLiveStat("127", { enabled: open });

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
          "left-0 flex w-full max-w-none translate-x-0 flex-col border-slate-200/90 bg-[#FAFBFF] p-0"
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <header className="border-b border-slate-200/80 px-4 pb-4 pr-12 pt-2 sm:px-6 sm:pb-5 sm:pr-6">
            <div
              className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-300/90"
              aria-hidden
            />
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
              <WorkspacePremiumIcon sx={{ color: "#1B2B5A", fontSize: 22 }} />
              <DialogTitle className="border-0 p-0 text-lg font-bold leading-tight text-[#1B2B5A] shadow-none sm:text-xl">
                {pricingUpgradeOfferTitle}
              </DialogTitle>
            </Stack>

            <DialogDescription asChild>
              <PricingUpgradeModalHeaderList signupDisplay={signupDisplay} />
            </DialogDescription>
          </header>

          <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-6 sm:pt-4">
            {loading && (
              <Typography sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                Loading plans…
              </Typography>
            )}

            {!loading && loadError && (
              <Typography sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                Plans could not be loaded.{" "}
                <Button component={Link} href="/pricing" size="small" onClick={() => onOpenChange(false)}>
                  Open pricing page
                </Button>
              </Typography>
            )}

            {!loading && !loadError && sortedPlans.length === 0 && (
              <Typography sx={{ py: 3, textAlign: "center", color: "text.secondary" }}>
                No active plans right now.{" "}
                <Button component={Link} href="/pricing" size="small" onClick={() => onOpenChange(false)}>
                  View pricing
                </Button>
              </Typography>
            )}

            {!loading && !loadError && sortedPlans.length > 0 && (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: `repeat(${Math.min(sortedPlans.length, 2)}, minmax(0, 1fr))`,
                      md: `repeat(${sortedPlans.length}, minmax(0, 1fr))`,
                    },
                    gap: 1.25,
                    mb: 2,
                    alignItems: "stretch",
                  }}
                >
                  {sortedPlans.map((plan, planIndex) => {
                    const stableId = getStablePlanId(plan, planIndex);
                    const accent = accentForPlan(plan);
                    const headline = planBillingHeadline(plan);
                    const { show: showWas, amountStr: wasAmountStr } = resolveWasPriceForPlan(
                      plan,
                      planIndex,
                      weeklyBaselineWasByPlanId
                    );
                    const wasNumeric = showWas ? parsePrice(wasAmountStr) : 0;
                    const priceNum = parsePrice(plan.price);
                    const discountPct = planListDiscountPercent(priceNum, wasNumeric);
                    const isRec = isThreeMonthPlan(plan) || plan.iconType === "BestValuePlan";

                    return (
                      <Paper
                        key={stableId}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2.5,
                          border: "2px solid",
                          borderColor: isRec
                            ? alpha(PLAN_ACCENT_BLUE, 0.55)
                            : alpha(PLAN_ACCENT_BLUE, 0.28),
                          backgroundColor: alpha(PLAN_ACCENT_BLUE, 0.04),
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          minWidth: 0,
                          boxShadow: isRec
                            ? `0 6px 20px ${alpha(PLAN_ACCENT_BLUE, 0.18)}`
                            : `0 1px 2px ${alpha(PLAN_ACCENT_BLUE, 0.08)}`,
                        }}
                      >
                        <Stack
                          direction="row"
                          alignItems="flex-end"
                          justifyContent="space-between"
                          spacing={1}
                          sx={{ mb: 1.25, minHeight: 44 }}
                        >
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}
                            >
                              {headline}
                            </Typography>
                            {discountPct != null ? (
                              <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700 }}>
                                Save {discountPct}%
                              </Typography>
                            ) : null}
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            {showWas ? (
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  textDecoration: "line-through",
                                  color: "text.disabled",
                                  fontWeight: 500,
                                }}
                              >
                                CA${formatPlanCadPrice(wasAmountStr)}
                              </Typography>
                            ) : null}
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: 800, color: accent, lineHeight: 1.1 }}
                            >
                              CA${formatPlanCadPrice(plan.price)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Button
                          variant="contained"
                          fullWidth
                          size="medium"
                          disabled={!plan.stripePriceId || !authLoaded}
                          startIcon={<BoltIcon sx={{ fontSize: 18 }} />}
                          onClick={() => onUpgradePlan(plan.stripePriceId)}
                          sx={{
                            py: 1.15,
                            fontSize: "0.9rem",
                            fontWeight: 700,
                            borderRadius: 2,
                            textTransform: "none",
                            boxShadow: "none",
                            background: `linear-gradient(135deg, ${accent} 0%, ${alpha(accent, 0.88)} 100%)`,
                            color: "#fff",
                            "&:hover": {
                              background: `linear-gradient(135deg, ${alpha(accent, 0.92)} 0%, ${alpha(accent, 0.78)} 100%)`,
                            },
                          }}
                        >
                          Subscribe
                        </Button>
                      </Paper>
                    );
                  })}
                </Box>

                <Typography
                  variant="caption"
                  component="p"
                  sx={{
                    textAlign: "center",
                    color: "text.secondary",
                    mb: 1.5,
                    px: 1,
                    lineHeight: 1.5,
                    fontSize: "0.75rem",
                  }}
                >
                  {pricingUpgradeModalHighlights.join(" · ")}
                </Typography>

                <Typography
                  variant="caption"
                  component="p"
                  sx={{
                    textAlign: "center",
                    color: "#059669",
                    fontWeight: 600,
                    mb: 2,
                    fontSize: "0.72rem",
                  }}
                >
                  48-hour money-back guarantee · 2 devices · Cancel anytime
                </Typography>

                <Box sx={{ textAlign: "center" }}>
                  <Button
                    component={Link}
                    href="/pricing"
                    size="small"
                    onClick={() => onOpenChange(false)}
                    sx={{ color: "text.secondary", fontWeight: 500, textTransform: "none" }}
                  >
                    Compare plans &amp; FAQs
                  </Button>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, color: "text.disabled" }}>
                    <Button
                      component={Link}
                      href="/practice-overview"
                      onClick={() => onOpenChange(false)}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 500,
                        textTransform: "none",
                        minWidth: 0,
                        p: 0,
                        fontSize: "inherit",
                      }}
                    >
                      Continue with free practice
                    </Button>
                  </Typography>
                </Box>
              </>
            )}
          </div>
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
