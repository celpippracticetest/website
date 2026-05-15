"use client";

import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DevicesIcon from "@mui/icons-material/Devices";
import ShieldIcon from "@mui/icons-material/Shield";
import StarIcon from "@mui/icons-material/Star";
import TimerIcon from "@mui/icons-material/Timer";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import {
  Avatar,
  AvatarGroup,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import {
  pricingTestimonials,
  pricingUpgradeOfferTitle,
  pricingUpgradeOfferTrustLine,
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
  formatBillingCycle,
  formatPlanCadPrice,
  getDurationGroupKey,
  getStablePlanId,
  isMonthlyPlan,
  isThreeMonthPlan,
  isWeeklyPlan,
  isYearlyPlan,
  parsePrice,
  PRICING_PLUS_FEATURE_LABELS,
} from "@/lib/pricing";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import type { SerializedPlan } from "@/types/pricing";

const GOOGLE_REVIEWS_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim();

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

function planSubtitle(plan: SerializedPlan): string {
  const t = plan.type?.trim();
  if (t) return t;
  const g = getDurationGroupKey(plan);
  if (g === "weekly") return "Short sprint";
  if (g === "monthly") return "Most flexible";
  if (g === "threeMonth") return "Best value";
  if (g === "yearly") return "Long prep";
  return "CELPIP Plus";
}

function accentForPlan(plan: SerializedPlan): string {
  const g = getDurationGroupKey(plan);
  if (g === "weekly") return "#64748B";
  if (g === "monthly") return "#3B82F6";
  if (g === "threeMonth" || g === "yearly") return "#1B2B5A";
  return "#2563EB";
}

function approximateDaysInPlan(plan: SerializedPlan): number {
  if (isWeeklyPlan(plan)) return 7;
  if (isMonthlyPlan(plan)) return 30;
  if (isThreeMonthPlan(plan)) return 90;
  if (isYearlyPlan(plan)) return 365;
  const iv = plan.billingInterval;
  const c =
    plan.billingIntervalCount && plan.billingIntervalCount > 0 ? plan.billingIntervalCount : 1;
  if (iv === "day") return c;
  if (iv === "week") return 7 * c;
  if (iv === "month") return 30 * c;
  if (iv === "year") return 365 * c;
  return 30;
}

function cadPerDay(plan: SerializedPlan, priceNum: number): string {
  const days = Math.max(1, approximateDaysInPlan(plan));
  return (priceNum / days).toFixed(2);
}

function isPopularPlanFromCms(plan: SerializedPlan): boolean {
  if (plan.iconType === "PopularPlan") return true;
  const t = `${plan.type} ${plan.title}`.toLowerCase();
  return (
    /\bpopular\b/.test(t) ||
    /\bbest seller\b/.test(t) ||
    /\bbest value\b/.test(t) ||
    /\bmost popular\b/.test(t)
  );
}

function isPopularPlan(plan: SerializedPlan): boolean {
  if (isThreeMonthPlan(plan) || plan.iconType === "BestValuePlan") return false;
  return isPopularPlanFromCms(plan);
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

function perBillingLabel(plan: SerializedPlan): string {
  const c = formatBillingCycle(plan.billingInterval, plan.billingIntervalCount);
  return c ? `per ${c}` : "per billing period";
}

function PricingNavModalInner({ open, onOpenChange }: PricingNavModalProps) {
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useHybridWebUser();
  const attribution = useCheckoutAttributionPayload();

  const [catalogPlans, setCatalogPlans] = useState<SerializedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [recentSignups, setRecentSignups] = useState<number | null>(null);

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch("/api/analytics/live-stats")
      .then(async (r) => {
        if (!r.ok) return;
        const data = (await r.json()) as { stats?: { recentSignups?: number } };
        if (!cancelled && data.stats?.recentSignups != null) {
          setRecentSignups(data.stats.recentSignups);
        }
      })
      .catch(() => {});
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

  const signupDisplay = recentSignups != null ? recentSignups.toLocaleString() : "127";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogDrawerContent
        closeButtonClassName="text-white opacity-90 hover:bg-white/15 hover:opacity-100 [&_svg]:text-white"
        className={cn(
          "w-[calc(100%-0.5rem)] !max-w-[min(100%,480px)] border-slate-200/90 bg-[#FAFBFF] p-0 sm:w-[calc(100%-0.75rem)]"
        )}
      >
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <div className="shrink-0 bg-gradient-to-br from-[#1B2B5A] via-[#2E4494] to-[#3B5998] px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
            <div
              className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/35 sm:mb-3.5"
              aria-hidden
            />
            <Box
              sx={{
                position: "relative",
                pr: 10,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                <WorkspacePremiumIcon sx={{ color: "#FCD34D", fontSize: 22 }} />
                <DialogTitle className="border-0 p-0 text-base font-bold leading-tight tracking-normal text-white shadow-none sm:text-lg">
                  {pricingUpgradeOfferTitle}
                </DialogTitle>
              </Stack>

              <DialogDescription className="mb-3 mt-0 text-xs font-normal leading-snug text-white/78 sm:text-sm">
                One plan, every feature. Pick the billing period that matches your exam timeline.
              </DialogDescription>

              <Stack
                direction="row"
                spacing={1.25}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <AvatarGroup
                  max={4}
                  sx={{
                    "& .MuiAvatar-root": {
                      width: 28,
                      height: 28,
                      fontSize: "0.7rem",
                      border: "2px solid rgba(255,255,255,0.2)",
                    },
                  }}
                >
                  {pricingTestimonials.slice(0, 4).map((t) => (
                    <Avatar key={t.name} src={`/images/${t.source}`} alt="" />
                  ))}
                </AvatarGroup>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                  <Box component="strong" sx={{ color: "#FCD34D" }}>
                    {signupDisplay}
                  </Box>{" "}
                  people joined in the last 24 hours · {pricingUpgradeOfferTrustLine}
                </Typography>
                {GOOGLE_REVIEWS_URL ? (
                  <Chip
                    component="a"
                    href={GOOGLE_REVIEWS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    clickable
                    icon={<StarIcon sx={{ fontSize: 12, color: "#FCD34D !important" }} />}
                    label="Read reviews"
                    size="small"
                    sx={{
                      backgroundColor: "rgba(252,211,77,0.15)",
                      color: "#FCD34D",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      height: 24,
                    }}
                  />
                ) : (
                  <Chip
                    icon={<StarIcon sx={{ fontSize: 12, color: "#FCD34D !important" }} />}
                    label="4.9/5 rating"
                    size="small"
                    sx={{
                      backgroundColor: "rgba(252,211,77,0.15)",
                      color: "#FCD34D",
                      fontWeight: 600,
                      fontSize: "0.65rem",
                      height: 24,
                    }}
                  />
                )}
              </Stack>
            </Box>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-6 pt-3 sm:px-4">
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
                gridTemplateColumns: "1fr",
                gap: 1.25,
                mb: 2,
              }}
            >
              {sortedPlans.map((plan, planIndex) => {
                const stableId = getStablePlanId(plan, planIndex);
                const accent = accentForPlan(plan);
                const headline = planBillingHeadline(plan);
                const subtitle = planSubtitle(plan);
                const priceNum = parsePrice(plan.price);
                const perDay = cadPerDay(plan, priceNum);
                const { show: showWas, amountStr: wasAmountStr } = resolveWasPriceForPlan(
                  plan,
                  planIndex,
                  weeklyBaselineWasByPlanId
                );
                const wasNumeric = showWas ? parsePrice(wasAmountStr) : 0;
                const discountPct = planListDiscountPercent(priceNum, wasNumeric);
                const isRec = isThreeMonthPlan(plan) || plan.iconType === "BestValuePlan";
                const isPop = isPopularPlan(plan);
                let badge: string | null = isRec ? "BEST VALUE" : isPop ? "MOST POPULAR" : null;
                if (isWeeklyPlan(plan) && badge === "MOST POPULAR") {
                  badge = "SHORT SPRINT";
                }

                return (
                  <Paper
                    key={stableId}
                    elevation={0}
                    sx={{
                      p: { xs: 1.5, sm: 1.75 },
                      borderRadius: 2,
                      border: "2px solid",
                      borderColor: isRec ? alpha("#F59E0B", 0.55) : "divider",
                      backgroundColor: "#fff",
                      position: "relative",
                      transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                      boxShadow: isRec
                        ? "0 4px 18px rgba(245, 158, 11, 0.12)"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                      "&:hover": {
                        borderColor: accent,
                        boxShadow: `0 4px 14px ${alpha(accent, 0.14)}`,
                      },
                    }}
                  >
                    {badge ? (
                      <Chip
                        label={badge}
                        size="small"
                        sx={{
                          position: "absolute",
                          top: -12,
                          left: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: isRec ? "#F59E0B" : accent,
                          color: isRec ? "#1B2B5A" : "#fff",
                          fontWeight: 700,
                          fontSize: "0.6rem",
                          height: 22,
                          letterSpacing: "0.05em",
                        }}
                      />
                    ) : null}

                    <Typography
                      variant="overline"
                      sx={{ color: accent, fontWeight: 700, letterSpacing: "0.04em", fontSize: "0.65rem" }}
                    >
                      {headline}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: "text.secondary", mb: 1, fontSize: "0.7rem" }}>
                      {subtitle}
                    </Typography>

                    <Stack direction="row" alignItems="baseline" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {showWas ? (
                        <Typography
                          variant="caption"
                          sx={{
                            textDecoration: "line-through",
                            color: "error.main",
                            fontWeight: 600,
                            mr: 0.5,
                          }}
                        >
                          Was CA${formatPlanCadPrice(wasAmountStr)}
                        </Typography>
                      ) : null}
                      <Typography variant="h6" sx={{ fontWeight: 800, color: accent }}>
                        CA${formatPlanCadPrice(plan.price)}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                      {perBillingLabel(plan)}
                    </Typography>

                    <Box
                      sx={{
                        mt: 1,
                        p: 0.75,
                        borderRadius: 1.25,
                        backgroundColor: isRec ? alpha(accent, 0.08) : "#F8FAFC",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} color={accent} sx={{ fontSize: "0.7rem" }}>
                        CA${perDay}/day
                      </Typography>
                    </Box>

                    {discountPct != null ? (
                      <Chip
                        label={`Save ${discountPct}%`}
                        size="small"
                        sx={{
                          mt: 1.25,
                          backgroundColor: "#ECFDF5",
                          color: "#059669",
                          fontWeight: 700,
                          fontSize: "0.7rem",
                          width: "100%",
                        }}
                      />
                    ) : null}

                    <Button
                      variant="contained"
                      fullWidth
                      size="medium"
                      disabled={!plan.stripePriceId || !authLoaded}
                      startIcon={<BoltIcon sx={{ fontSize: 18 }} />}
                      onClick={() => onUpgradePlan(plan.stripePriceId)}
                      sx={{
                        mt: 1.5,
                        py: 1.1,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: "none",
                        boxShadow: "none",
                        ...(isRec
                          ? {
                              background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
                              color: "#1B2B5A",
                              "&:hover": {
                                background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
                                boxShadow: "none",
                              },
                            }
                          : {
                              background: `linear-gradient(135deg, ${accent} 0%, ${alpha(accent, 0.88)} 100%)`,
                              color: "#fff",
                              "&:hover": {
                                background: `linear-gradient(135deg, ${alpha(accent, 0.92)} 0%, ${alpha(accent, 0.78)} 100%)`,
                                boxShadow: "none",
                              },
                            }),
                      }}
                    >
                      Get Plus — {headline} (CA${formatPlanCadPrice(plan.price)})
                    </Button>
                  </Paper>
                );
              })}
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 1.75 },
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "white",
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
                <AllInclusiveIcon sx={{ fontSize: 16, color: "#2563EB" }} />
                <Typography variant="caption" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Everything included:
                </Typography>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 0.75,
                }}
              >
                {PRICING_PLUS_FEATURE_LABELS.map((label) => (
                  <Stack direction="row" spacing={1} alignItems="flex-start" key={label}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#10B981", flexShrink: 0, mt: "2px" }} />
                    <Typography variant="caption" fontWeight={500} sx={{ lineHeight: 1.35 }}>
                      {label}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            </Paper>

            <Stack
              direction="column"
              spacing={1}
              justifyContent="center"
              alignItems="stretch"
              sx={{
                p: 1.25,
                borderRadius: 2,
                backgroundColor: "#F0FDF4",
                border: "1px solid #BBF7D0",
                mb: 1.5,
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <ShieldIcon sx={{ fontSize: 16, color: "#059669", flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={600} color="#059669">
                  48-hour money-back guarantee
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <DevicesIcon sx={{ fontSize: 16, color: "#059669", flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={600} color="#059669">
                  Use on 2 devices
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <TimerIcon sx={{ fontSize: 16, color: "#059669", flexShrink: 0 }} />
                <Typography variant="caption" fontWeight={600} color="#059669">
                  Cancel anytime
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ textAlign: "center", mb: 0.5 }}>
              <Button
                component={Link}
                href="/pricing"
                size="small"
                onClick={() => onOpenChange(false)}
                sx={{ color: "text.secondary", fontWeight: 500 }}
              >
                View all plans &amp; FAQs
              </Button>
            </Box>

            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                Not ready to commit?
              </Typography>
              <Button
                component={Link}
                href="/practice-overview"
                onClick={() => onOpenChange(false)}
                size="small"
                sx={{ color: "text.secondary", fontWeight: 500, textDecoration: "underline" }}
              >
                Continue with free practice →
              </Button>
            </Box>
          </>
        )}
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
