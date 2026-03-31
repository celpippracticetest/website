"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { SubscriptionPlanFromStripe } from "@/lib/loadActivePlansWithStripePrices";
import { useUserContext } from "@/hooks/useUserContext";
import { formatBillingCycle, getDurationGroupKeyFromStripeRecurring } from "@/lib/pricing";

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
  const [plans, setPlans] = useState<SubscriptionPlanFromStripe[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showRefundChallenge, setShowRefundChallenge] = useState(false);

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

  const examDateLabel = userContext.onboardingProfile?.testDate || "Not specified";
  const refund50Deadline = useMemo(() => addDaysFromTodayLabel(90), []);
  const refund100Deadline = useMemo(() => addDaysFromTodayLabel(60), []);
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

  return (
    <div className="min-h-screen bg-[#F6F9FF] px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-orange-200 bg-white p-6 shadow-sm md:p-8">
        <p className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-orange-700">
          {showRefundChallenge ? "Goal Protection Offer" : "Final Chance"}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
          {showRefundChallenge
            ? "Refund challenge based on your goal"
            : "Get 20% off your first billing period"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {showRefundChallenge
            ? "Choose a challenge path tied to your exam timeline and target CLB."
            : "Based on your onboarding answers, we picked one recommended plan for you. This discount is applied automatically at checkout."}
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

            <div className="mt-4 rounded-xl border border-blue-200 bg-white/90 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Your goal for this challenge
              </p>
              <p className="mt-1 text-base font-bold text-slate-900">
                {targetScoreForChallenge !== null ? (
                  <>
                    Target CLB{" "}
                    <span className="text-blue-800">{targetScoreForChallenge}</span>
                    <span className="pl-1 text-sm font-semibold text-slate-600">
                      (all skills)
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-slate-600">
                    Complete onboarding or set a target in your profile so we can show your goal
                    here.
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Exam timeline:{" "}
                <span className="font-bold text-slate-900">{examDateLabel}</span>
              </p>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-[linear-gradient(180deg,_#FFF7E8_0%,_#FFFFFF_100%)] p-4 shadow-[0_12px_30px_rgba(245,158,11,0.12)]">
                <div className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                  Popular
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
                  50% Refund Challenge
                </p>
                <p className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-amber-800">
                  Time window: 90 days
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {targetScoreForChallenge !== null
                    ? `Hit CLB ${targetScoreForChallenge} in every skill within ${refund50Deadline} — then get 50% refunded.`
                    : `Hit your target CLB in every skill within ${refund50Deadline} — then get 50% refunded.`}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-300 bg-[linear-gradient(180deg,_#ECFDF3_0%,_#FFFFFF_100%)] p-4 shadow-[0_12px_30px_rgba(16,185,129,0.12)]">
                <div className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                  Premium
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  Full Refund Challenge
                </p>
                <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.08em] text-emerald-800">
                  Time window: 60 days
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {targetScoreForChallenge !== null ? (
                    <>
                      achieve CLB {targetScoreForChallenge} within {refund100Deadline} and get
                      100% refunded.
                    </>
                  ) : (
                    <>
                      achieve your target CLB within {refund100Deadline} and get 100% refunded.
                    </>
                  )}
                </p>
              </div>
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
              <form
                action={`/api/checkout_session?price=${encodeURIComponent(recommendedPlan.priceId)}`}
                method="POST"
                className="mt-4"
              >
                <input type="hidden" name="challenge_mode" value="refund_goal" />
                <input
                  type="hidden"
                  name="challenge_target_clb"
                  value={
                    targetScoreForChallenge !== null
                      ? String(targetScoreForChallenge)
                      : ""
                  }
                />
                <input type="hidden" name="challenge_window_days" value="90" />
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white"
                >
                  Start Challenge with This Plan
                </button>
              </form>
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
            <form
              action={`/api/checkout_session?price=${encodeURIComponent(recommendedPlan.priceId)}`}
              method="POST"
              className="mt-5"
            >
              <input type="hidden" name="final_offer" value="onboarding_final_chance" />
              <button
                type="submit"
                className="w-full cursor-pointer rounded-full bg-[linear-gradient(270deg,_#F79D65_0%,_#759CFF_100%)] px-4 py-3 text-sm font-semibold text-white"
              >
                Continue to Secure Checkout
              </button>
            </form>
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
