"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { SubscriptionPlanFromStripe } from "@/lib/loadActivePlansWithStripePrices";
import { useCheckoutAttributionPayload } from "@/components/analytics/CheckoutAttributionFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserContext } from "@/hooks/useUserContext";
import { formatBillingCycle, getDurationGroupKeyFromStripeRecurring } from "@/lib/pricing";
import {
  FINAL_OFFER_CHALLENGE_SOURCE,
  FINAL_OFFER_CHALLENGE_TIERS,
  type FinalOfferChallengeTierKey,
} from "@/lib/finalOfferChallenge";

type OfferPlan = SubscriptionPlanFromStripe & {
  durationKey: "weekly" | "monthly" | "threeMonth" | "yearly" | null;
  isPremiumPlus: boolean;
};

function isPremiumPlusPlanName(planName: string) {
  const lower = planName.toLowerCase();
  return lower.includes("plus") || lower.includes("pro") || lower.includes("best value");
}

function toCad(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function toDiscountedAmount(amount: number, percentOff: number) {
  const safePercent = Math.max(0, Math.min(100, percentOff));
  return amount * (1 - safePercent / 100);
}

function addDaysFromTodayLabel(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Public paths (filenames contain spaces — encode for URLs). */
const STRIPE_WORDMARK_WHITE_SRC =
  "/icons/stripe/Stripe%20wordmark%20-%20White%20-%20Small.png";
const PAYPAL_MONOGRAM_SRC = "/icons/paypal/PayPal-Monogram-FullColor-RGB.png";

const SUB_GOAL_MIN_CLB: Record<string, number> = {
  "Federal Skilled Worker Program (FSWP)": 7,
  "Canadian Experience Class (CEC) - TEER 0 or 1": 7,
  "Canadian Experience Class (CEC) - TEER 2 or 3": 5,
  "Federal Skilled Trades Program (FSTP)": 4,
  "Provincial Nominee Program (PNP)": 4,
  "Citizenship Application (Ages 18-54)": 4,
  "Real Estate License (BC - BCFSA)": 7,
  "Pharmacist License (OCP / National)": 7,
  "College of Physicians and Surgeons (CPSO)": 7,
  "Nursing (Various Provincial Colleges)": 7,
  "Immigration Consultant (CICC)": 9,
  "Post-Graduation Work Permit (PGWP)": 7,
  "Canadian Corporate Employers": 7,
  "Superior English (Highest Points)": 8,
  "Proficient English": 7,
  "Competent English (Minimum for PR)": 6,
  "Temporary Graduate Visa (Subclass 485)": 6,
  "Vocational English (Subclass 482)": 5,
};

export default function FinalOfferPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const userContext = useUserContext();
  const attribution = useCheckoutAttributionPayload();
  const [plans, setPlans] = useState<SubscriptionPlanFromStripe[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showRefundChallenge, setShowRefundChallenge] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [challengePaymentModalOpen, setChallengePaymentModalOpen] = useState(false);
  const [challengePaypalLoading, setChallengePaypalLoading] = useState(false);
  const [challengePaypalError, setChallengePaypalError] = useState<string | null>(null);
  const [selectedChallengeTier, setSelectedChallengeTier] =
    useState<FinalOfferChallengeTierKey>("30d_100pct");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-up");
      return;
    }
    const plan = (user?.publicMetadata as Record<string, unknown> | undefined)?.plan;
    if (plan && plan !== "free") {
      router.replace("/practice-overview");
    }
  }, [isLoaded, isSignedIn, router, user?.publicMetadata]);

  useEffect(() => {
    let cancelled = false;
    const loadPlans = async () => {
      try {
        setIsLoadingPlans(true);
        const res = await fetch("/api/plans/available", { method: "GET" });
        const data = (await res.json()) as { plans?: SubscriptionPlanFromStripe[]; error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Could not load plans");
        }
        if (!cancelled) {
          setPlans(data.plans || []);
        }
      } catch (err) {
        if (!cancelled) {
          setPlanError(err instanceof Error ? err.message : "Could not load plans");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlans(false);
        }
      }
    };

    void loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendedPlan = useMemo(() => {
    const normalized: OfferPlan[] = plans.map((plan) => ({
      ...plan,
      durationKey: getDurationGroupKeyFromStripeRecurring(
        plan.interval as "week" | "month" | "year" | undefined,
        plan.intervalCount
      ),
      isPremiumPlus: isPremiumPlusPlanName(plan.name),
    }));

    const byDuration = {
      weekly: normalized.filter((p) => p.durationKey === "weekly"),
      monthly: normalized.filter((p) => p.durationKey === "monthly"),
      threeMonth: normalized.filter((p) => p.durationKey === "threeMonth"),
      yearly: normalized.filter((p) => p.durationKey === "yearly"),
    };

    const testDate = userContext.onboardingProfile?.testDate || "";
    const premiumPlusByDuration = {
      monthly: byDuration.monthly.filter((p) => p.isPremiumPlus),
      threeMonth: byDuration.threeMonth.filter((p) => p.isPremiumPlus),
      yearly: byDuration.yearly.filter((p) => p.isPremiumPlus),
      weekly: byDuration.weekly.filter((p) => p.isPremiumPlus),
    };

    // Business rule:
    // - less than / around 1 month -> recommend monthly
    // - more than 1 month -> recommend 3-month
    // - always recommend Pro (Premium Plus)
    const isUnderOrAtOneMonth =
      testDate === "In less than 2 weeks" || testDate === "In 1 month";
    const isMoreThanOneMonth =
      testDate === "In 2+ months" || testDate === "I haven't booked it yet";

    if (isUnderOrAtOneMonth) {
      return (
        premiumPlusByDuration.monthly[0] ||
        premiumPlusByDuration.threeMonth[0] ||
        premiumPlusByDuration.yearly[0] ||
        premiumPlusByDuration.weekly[0] ||
        normalized.find((p) => p.isPremiumPlus) ||
        null
      );
    }

    if (isMoreThanOneMonth) {
      return (
        premiumPlusByDuration.threeMonth[0] ||
        premiumPlusByDuration.monthly[0] ||
        premiumPlusByDuration.yearly[0] ||
        premiumPlusByDuration.weekly[0] ||
        normalized.find((p) => p.isPremiumPlus) ||
        null
      );
    }

    return (
      premiumPlusByDuration.threeMonth[0] ||
      premiumPlusByDuration.monthly[0] ||
      premiumPlusByDuration.yearly[0] ||
      premiumPlusByDuration.weekly[0] ||
      normalized.find((p) => p.isPremiumPlus) ||
      null
    );
  }, [plans, userContext.onboardingProfile?.testDate]);

  const targetClb = useMemo(() => {
    const parsed = Number.parseFloat(userContext.targetCLB || "");
    return Number.isFinite(parsed) ? parsed : null;
  }, [userContext.targetCLB]);

  const programMinClb = useMemo(() => {
    const subGoal = userContext.onboardingProfile?.subGoal || "";
    return subGoal ? SUB_GOAL_MIN_CLB[subGoal] ?? null : null;
  }, [userContext.onboardingProfile?.subGoal]);

  /**
   * Challenge target CLB = max(user target, required program CLB) + 1.
   * Falls back to whichever source exists, then adds +1.
   */
  const targetScoreForChallenge = useMemo(() => {
    const fromProfile = userContext.onboardingProfile?.targetScore;
    const userTarget =
      targetClb !== null
        ? targetClb
        : typeof fromProfile === "number" && Number.isFinite(fromProfile)
          ? fromProfile
          : null;

    if (userTarget === null && programMinClb === null) {
      return null;
    }

    const baseline = Math.max(userTarget ?? Number.MIN_SAFE_INTEGER, programMinClb ?? Number.MIN_SAFE_INTEGER);
    return baseline + 1;
  }, [targetClb, userContext.onboardingProfile?.targetScore, programMinClb]);

  const refund50Deadline = useMemo(() => addDaysFromTodayLabel(60), []);
  const refund100Deadline = useMemo(() => addDaysFromTodayLabel(30), []);
  const firstPeriodDiscountedAmount = useMemo(() => {
    if (!recommendedPlan) return null;
    return toDiscountedAmount(recommendedPlan.amount, 20);
  }, [recommendedPlan]);

  const challengeTier = useMemo(() => {
    const score = targetScoreForChallenge;
    if (score !== null && score >= 9) {
      return "advanced";
    }
    if (score !== null && score >= 7) {
      return "standard";
    }
    return "starter";
  }, [targetScoreForChallenge]);

  const submitFinalOfferStripe = () => {
    const priceId = recommendedPlan?.priceId?.trim();
    if (!priceId) return;
    setPaypalError(null);
    const checkoutAction = `/api/checkout_session?price=${encodeURIComponent(priceId)}`;
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
    add("final_offer", "onboarding_final_chance");
    for (const [key, value] of Object.entries(attribution)) {
      if (value) add(key, value);
    }
    document.body.appendChild(form);
    form.submit();
  };

  const submitChallengeStripe = () => {
    const priceId = recommendedPlan?.priceId?.trim();
    if (!priceId) return;
    setChallengePaypalError(null);
    const checkoutAction = `/api/checkout_session?price=${encodeURIComponent(priceId)}`;
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
    const tier = FINAL_OFFER_CHALLENGE_TIERS[selectedChallengeTier];
    if (targetScoreForChallenge !== null && tier) {
      add("challenge_mode", "refund_goal");
      add("challenge_target_clb", String(targetScoreForChallenge));
      add("challenge_window_days", String(tier.windowDays));
      add("challenge_refund_percent", String(tier.refundPercent));
      add("challenge_offer_source", FINAL_OFFER_CHALLENGE_SOURCE);
    }
    for (const [key, value] of Object.entries(attribution)) {
      if (value) add(key, value);
    }
    document.body.appendChild(form);
    form.submit();
  };

  const startChallengePayPal = async () => {
    const priceId = recommendedPlan?.priceId?.trim();
    if (!priceId) return;
    setChallengePaypalError(null);
    setChallengePaypalLoading(true);
    try {
      const tier = FINAL_OFFER_CHALLENGE_TIERS[selectedChallengeTier];
      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripePriceId: priceId,
          attribution,
          ...(targetScoreForChallenge !== null && tier
            ? {
                challenge: {
                  mode: "refund_goal",
                  targetClb: targetScoreForChallenge,
                  windowDays: tier.windowDays,
                  refundPercent: tier.refundPercent,
                  offerSource: FINAL_OFFER_CHALLENGE_SOURCE,
                },
              }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        approvalUrl?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not start PayPal checkout");
      }
      if (!data.approvalUrl) {
        throw new Error("Missing PayPal approval URL");
      }
      window.location.href = data.approvalUrl;
    } catch (e) {
      setChallengePaypalError(e instanceof Error ? e.message : "PayPal checkout failed");
      setChallengePaypalLoading(false);
    }
  };

  const startPayPalFinalOffer = async () => {
    const priceId = recommendedPlan?.priceId?.trim();
    if (!priceId) return;
    setPaypalError(null);
    setPaypalLoading(true);
    try {
      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripePriceId: priceId,
          attribution,
          finalOffer: "onboarding_final_chance",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        approvalUrl?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not start PayPal checkout");
      }
      if (!data.approvalUrl) {
        throw new Error("Missing PayPal approval URL");
      }
      window.location.href = data.approvalUrl;
    } catch (e) {
      setPaypalError(e instanceof Error ? e.message : "PayPal checkout failed");
      setPaypalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FF] px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-orange-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
          {showRefundChallenge ? "Goal Protection Offer" : "Final Chance"}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
          {showRefundChallenge
            ? "Choose your competitive challenge"
            : "Get 20% off your first billing period"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {showRefundChallenge
            ? "Two tracks, one goal: hit your CLB in every skill before the deadline."
            : "Based on your onboarding answers, we picked one recommended plan for you. Your 20% off the first billing period applies whether you subscribe with Stripe or PayPal."}
        </p>

        {isLoadingPlans ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Loading your personalized offer...
          </div>
        ) : planError ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {planError}
          </div>
        ) : !recommendedPlan?.priceId ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            No eligible plan found right now.
          </div>
        ) : showRefundChallenge ? (
          <div className="mt-8 rounded-2xl border border-blue-200 bg-[linear-gradient(180deg,_#EEF5FF_0%,_#FFFFFF_45%)] p-5 shadow-[0_14px_35px_rgba(59,130,246,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
              One More Chance
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedChallengeTier("60d_50pct")}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left outline-none transition ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  selectedChallengeTier === "60d_50pct"
                    ? "border-amber-700 bg-[linear-gradient(180deg,_#FDE68A_0%,_#FFFBEB_100%)] shadow-[0_14px_32px_rgba(180,83,9,0.2)]"
                    : "border-amber-200 bg-[linear-gradient(180deg,_#FFFBEB_0%,_#FFFFFF_100%)] shadow-[0_8px_22px_rgba(245,158,11,0.08)] hover:border-amber-300"
                }`}
              >
                <div
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white ${
                    selectedChallengeTier === "60d_50pct" ? "bg-amber-800" : "bg-amber-400"
                  }`}
                >
                  Popular
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                  {FINAL_OFFER_CHALLENGE_TIERS["60d_50pct"].shortLabel}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-amber-800">
                  50% refund potential · 60 days
                </p>
                <p className="mt-1 text-xs font-medium text-amber-900/90">
                  {FINAL_OFFER_CHALLENGE_TIERS["60d_50pct"].competitiveLabel}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {targetScoreForChallenge !== null
                    ? `Hit CLB ${targetScoreForChallenge} in every skill by ${refund50Deadline}.`
                    : `Hit your target CLB in every skill by ${refund50Deadline}.`}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedChallengeTier("30d_100pct")}
                className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left outline-none transition ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  selectedChallengeTier === "30d_100pct"
                    ? "border-emerald-800 bg-[linear-gradient(180deg,_#6EE7B7_0%,_#ECFDF5_100%)] shadow-[0_14px_32px_rgba(5,150,105,0.24)]"
                    : "border-emerald-200 bg-[linear-gradient(180deg,_#F0FDF4_0%,_#FFFFFF_100%)] shadow-[0_8px_22px_rgba(16,185,129,0.08)] hover:border-emerald-300"
                }`}
              >
                <div
                  className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white ${
                    selectedChallengeTier === "30d_100pct" ? "bg-emerald-800" : "bg-emerald-500"
                  }`}
                >
                  Elite
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  {FINAL_OFFER_CHALLENGE_TIERS["30d_100pct"].shortLabel}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-800">
                  100% refund potential · 30 days
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-900/90">
                  {FINAL_OFFER_CHALLENGE_TIERS["30d_100pct"].competitiveLabel}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {targetScoreForChallenge !== null ? (
                    <>Achieve CLB {targetScoreForChallenge} by {refund100Deadline}.</>
                  ) : (
                    <>Achieve your target CLB by {refund100Deadline}.</>
                  )}
                </p>
              </button>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Recommended Plan (Regular Price)
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{recommendedPlan.name}</p>
              <p className="text-sm text-slate-700">
                {toCad(recommendedPlan.amount)} /{" "}
                {formatBillingCycle(
                  recommendedPlan.interval as "day" | "week" | "month" | "year" | undefined,
                  recommendedPlan.intervalCount
                )}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Checkout uses the regular price (no coupons or promotions). Challenge refunds are not
                automatic; we review emailed proof before any refund.
              </p>
              <Dialog
                open={challengePaymentModalOpen}
                onOpenChange={(open) => {
                  setChallengePaymentModalOpen(open);
                  if (!open) setChallengePaypalError(null);
                }}
              >
                <DialogContent className="border-slate-200 bg-white sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-blue-950">Choose payment method</DialogTitle>
                    <DialogDescription className="text-slate-600">
                      Pay with Stripe or PayPal at the regular subscription price (no discounts).
                      Your selected track:{" "}
                      <span className="font-semibold text-slate-800">
                        {FINAL_OFFER_CHALLENGE_TIERS[selectedChallengeTier].shortLabel} (
                        {FINAL_OFFER_CHALLENGE_TIERS[selectedChallengeTier].refundPercent}% potential,{" "}
                        {FINAL_OFFER_CHALLENGE_TIERS[selectedChallengeTier].windowDays} days).
                      </span>{" "}
                      Refunds, if you qualify, are manual after emailed score proof.
                      {targetScoreForChallenge === null ? (
                        <>
                          {" "}
                          Without a target CLB we cannot enroll you in the challenge; you can still
                          subscribe at full price.
                        </>
                      ) : null}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setChallengePaymentModalOpen(false);
                        submitChallengeStripe();
                      }}
                      disabled={challengePaypalLoading}
                      aria-label="Subscribe with Stripe"
                      className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-md bg-[#635BFF] px-4 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#5851DF] focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"
                    >
                      <span>Subscribe with</span>
                      <Image
                        src={STRIPE_WORDMARK_WHITE_SRC}
                        alt=""
                        width={56}
                        height={20}
                        className="h-5 w-auto shrink-0 object-contain object-center"
                      />
                    </button>
                    <button
                      type="button"
                      disabled={challengePaypalLoading}
                      onClick={() => void startChallengePayPal()}
                      aria-label="Subscribe with PayPal"
                      className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-md border border-[#2C2E2F] bg-[#FFC439] px-4 py-3 text-sm font-bold tracking-tight text-[#003087] shadow-sm outline-none transition hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-[#003087] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"
                    >
                      <Image
                        src={PAYPAL_MONOGRAM_SRC}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 shrink-0 object-contain object-center"
                      />
                      {challengePaypalLoading ? "Redirecting to PayPal…" : "Subscribe with PayPal"}
                    </button>
                    {challengePaypalError ? (
                      <p className="text-center text-sm text-red-600" role="alert">
                        {challengePaypalError}
                      </p>
                    ) : null}
                  </div>
                </DialogContent>
              </Dialog>
              <button
                type="button"
                onClick={() => {
                  setChallengePaypalError(null);
                  setChallengePaymentModalOpen(true);
                }}
                aria-label={
                  selectedChallengeTier === "30d_100pct"
                    ? "Subscribe with full refund challenge"
                    : "Subscribe with 50% refund challenge"
                }
                className={`mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold text-white outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 ${
                  selectedChallengeTier === "30d_100pct"
                    ? "bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-emerald-600"
                    : "bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-600"
                }`}
              >
                {selectedChallengeTier === "30d_100pct"
                  ? "Subscribe with full refund challenge"
                  : "Subscribe with 50% refund challenge"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/practice-overview")}
                className="mt-3 w-full cursor-pointer rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
              >
                Continue without subscription
              </button>
            </div>

            
            <p className="mt-2 text-sm leading-6 text-slate-700">
              We use the CELPIP Scores and Identity Verification System (SIVS) to validate score
              outcomes. Once you achieve your target result, email your score evidence to{" "}
              <a
                href="mailto:accounts@celpippracticetest.com"
                className="font-semibold text-blue-700 underline"
              >
                accounts@celpippracticetest.com
              </a>{" "}
              and we process your refund.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
              Recommended Plan
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{recommendedPlan.name}</h2>
            <p className="mt-2 text-slate-700">
              <span className="text-sm font-semibold text-slate-500 line-through">
                {toCad(recommendedPlan.amount)}
              </span>
              <span className="ml-2 text-2xl font-bold text-emerald-700">
                {toCad(firstPeriodDiscountedAmount ?? recommendedPlan.amount)}
              </span>
              <span className="ml-1 text-sm text-slate-500">
                /{" "}
                {formatBillingCycle(
                  recommendedPlan.interval as "day" | "week" | "month" | "year" | undefined,
                  recommendedPlan.intervalCount
                )}
              </span>
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-700">
              20% off first billing period
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <button
                type="button"
                onClick={submitFinalOfferStripe}
                disabled={paypalLoading}
                aria-label="Subscribe with Stripe"
                className="flex min-h-[48px] w-full flex-1 items-center justify-center gap-2.5 rounded-md bg-[#635BFF] px-4 py-3 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#5851DF] focus-visible:ring-2 focus-visible:ring-[#635BFF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"
              >
                <span>Subscribe with</span>
                <Image
                  src={STRIPE_WORDMARK_WHITE_SRC}
                  alt=""
                  width={56}
                  height={20}
                  className="h-5 w-auto shrink-0 object-contain object-center"
                />
              </button>
              <button
                type="button"
                disabled={paypalLoading}
                onClick={() => void startPayPalFinalOffer()}
                aria-label="Subscribe with PayPal"
                className="flex min-h-[48px] w-full flex-1 items-center justify-center gap-2.5 rounded-md border border-[#2C2E2F] bg-[#FFC439] px-4 py-3 text-sm font-bold tracking-tight text-[#003087] shadow-sm outline-none transition hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-[#003087] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"
              >
                <Image
                  src={PAYPAL_MONOGRAM_SRC}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 shrink-0 object-contain object-center"
                />
                {paypalLoading ? "Redirecting to PayPal…" : "Subscribe with PayPal"}
              </button>
            </div>
            {paypalError ? (
              <p className="mt-3 text-center text-sm text-red-600" role="alert">
                {paypalError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setShowRefundChallenge(true)}
              className="mt-3 w-full cursor-pointer rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700"
            >
              No thanks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
