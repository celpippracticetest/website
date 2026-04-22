import React, { useEffect, useMemo, useRef, useState } from "react";
import SvgCheckCircle from "@/components/icons/CheckCircle";
import { formatSubscriptionLabelForDisplay } from "@/lib/subscriptionAccess";

interface Plan {
  id: string;
  name: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  /** Same `order` as marketing pricing page; lower first. */
  order?: number;
  metadata?: Record<string, string>;
}

function formatPlanPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlans: Plan[];
  currentPlanName?: string;
  currentPriceId?: string;
  onChangePlan: (priceId: string) => Promise<void>;
  loading: boolean;
  onCancelSubscription: () => void;
}

function planMatchesDisplayName(plan: Plan, currentPlanName: string) {
  const lowerName = currentPlanName.toLowerCase();
  const planLowerName = plan.name.toLowerCase();
  return (
    lowerName.includes(planLowerName) ||
    (plan.interval === "month" &&
      lowerName.includes("monthly")) ||
    (plan.interval === "year" &&
      lowerName.includes("yearly")) ||
    (plan.interval === "week" &&
      lowerName.includes("weekly")) ||
    (plan.interval === "month" &&
      plan.intervalCount === 3 &&
      lowerName.includes("3 months"))
  );
}

function resolveCurrentPlan(
  availablePlans: Plan[],
  currentPriceId?: string,
  currentPlanName?: string
): Plan | undefined {
  const pid = currentPriceId?.trim();
  if (pid) {
    const byId = availablePlans.find((p) => p.priceId.trim() === pid);
    if (byId) {
      return byId;
    }
  }
  if (currentPlanName?.trim()) {
    return availablePlans.find((p) => planMatchesDisplayName(p, currentPlanName));
  }
  return undefined;
}

type DurationTabKey = "weekly" | "monthly" | "threeMonth";

const DURATION_TAB_ORDER: DurationTabKey[] = ["weekly", "monthly", "threeMonth"];

const DURATION_TAB_LABELS: Record<DurationTabKey, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  threeMonth: "3-Month",
};

function getPlanDurationTab(plan: Plan): DurationTabKey | null {
  const count = plan.intervalCount ?? 1;
  if (plan.interval === "week" && count === 1) {
    return "weekly";
  }
  if (plan.interval === "month" && count === 1) {
    return "monthly";
  }
  if (plan.interval === "month" && count === 3) {
    return "threeMonth";
  }
  return null;
}

function bucketPlansByDurationTab(plans: Plan[]): Record<DurationTabKey, Plan[]> {
  const buckets: Record<DurationTabKey, Plan[]> = {
    weekly: [],
    monthly: [],
    threeMonth: [],
  };
  for (const p of plans) {
    const tab = getPlanDurationTab(p);
    if (tab) {
      buckets[tab].push(p);
    }
  }
  return buckets;
}

function ChangePlanPlanRow({
  plan,
  currentPlan,
  loading,
  onChangePlan,
}: {
  plan: Plan;
  currentPlan?: Plan;
  loading: boolean;
  onChangePlan: (priceId: string) => Promise<void>;
}) {
  const isCurrent = Boolean(
    currentPlan && plan.priceId.trim() === currentPlan.priceId.trim()
  );

  let actionText = "Switch";
  if (currentPlan) {
    if (plan.amount > currentPlan.amount) {
      actionText = "Upgrade";
    } else if (plan.amount < currentPlan.amount) {
      actionText = "Downgrade";
    }
  }

  return (
    <div
      role="listitem"
      aria-disabled={isCurrent}
      aria-current={isCurrent ? "true" : undefined}
      title={
        isCurrent
          ? "This is your active plan. Choose another plan to switch."
          : undefined
      }
      className={`flex items-center justify-between gap-3 p-4 rounded-xl border ${
        isCurrent
          ? "border-[#4A7DFF]/60 bg-[#F2F6FF] cursor-not-allowed opacity-75 saturate-75"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div>
        <h3
          className={`font-semibold text-[16px] ${
            isCurrent ? "text-[#76808F]" : "text-[#212E42]"
          }`}
        >
          {formatSubscriptionLabelForDisplay(plan.name)}
        </h3>
        <div
          className={`text-[14px] ${isCurrent ? "text-[#9CA3AF]" : "text-[#76808F]"}`}
        >
          {formatPlanPrice(plan.amount, plan.currency)} /{" "}
          {plan.intervalCount && plan.intervalCount > 1
            ? `${plan.intervalCount} ${plan.interval}s`
            : plan.interval}
        </div>
      </div>

      {isCurrent ? (
        <div className="flex shrink-0 items-center gap-2 text-[#4A7DFF]/90">
          <SvgCheckCircle className="h-5 w-5" aria-hidden />
          <span className="text-right text-[13px] font-semibold leading-tight sm:text-[14px]">
            Current plan
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChangePlan(plan.priceId)}
          disabled={loading}
          className={`shrink-0 px-4 py-2 cursor-pointer rounded-full font-medium text-[14px] transition-colors disabled:opacity-50 ${
            actionText === "Downgrade"
              ? "bg-transparent text-[#4A7DFF] border border-[#4A7DFF] hover:bg-[#F2F6FF]"
              : "bg-[#0DAA94] text-white hover:bg-[#0DAA94]/80"
          }`}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

const ChangePlanModal = ({
  isOpen,
  onClose,
  availablePlans,
  currentPlanName,
  currentPriceId,
  onChangePlan,
  loading,
  onCancelSubscription,
}: ChangePlanModalProps) => {
  const sortedPlans = useMemo(() => {
    return [...availablePlans].sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) {
        return oa - ob;
      }
      return a.amount - b.amount;
    });
  }, [availablePlans]);

  const plansByTab = useMemo(
    () => bucketPlansByDurationTab(sortedPlans),
    [sortedPlans]
  );

  const otherDurationPlans = useMemo(
    () => sortedPlans.filter((p) => getPlanDurationTab(p) === null),
    [sortedPlans]
  );

  const currentPlan = useMemo(
    () => resolveCurrentPlan(availablePlans, currentPriceId, currentPlanName),
    [availablePlans, currentPriceId, currentPlanName]
  );

  const [activeTab, setActiveTab] = useState<DurationTabKey>("weekly");
  const wasOpenRef = useRef(false);
  const prevSortedPlansLenRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      prevSortedPlansLenRef.current = 0;
      return;
    }
    const len = sortedPlans.length;
    const prevLen = prevSortedPlansLenRef.current;
    const shouldPickTab =
      !wasOpenRef.current || (prevLen === 0 && len > 0);

    if (shouldPickTab) {
      const tabOfCurrent = currentPlan ? getPlanDurationTab(currentPlan) : null;
      if (tabOfCurrent && plansByTab[tabOfCurrent].length > 0) {
        setActiveTab(tabOfCurrent);
      } else {
        const first =
          DURATION_TAB_ORDER.find((k) => plansByTab[k].length > 0) ?? "weekly";
        setActiveTab(first);
      }
    }
    wasOpenRef.current = true;
    prevSortedPlansLenRef.current = len;
  }, [isOpen, currentPlan, plansByTab, sortedPlans.length]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-[#17161680] flex justify-center items-center z-[9999] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[24px] w-full max-w-[600px] p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-[#212E42] text-[20px] font-semibold mb-2">
            Change billing period
          </h2>
          <p className="text-[#76808F] text-[14px]">
            Pick how often you are billed for Plus. Stripe applies the change to your subscription.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {availablePlans.length === 0 && loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading available plans...
            </div>
          ) : availablePlans.length === 0 ? (
            <div className="text-center py-8 px-2 text-[#76808F] text-[14px] leading-relaxed">
              No plans could be loaded. You can still open the billing portal from your account to change or cancel your subscription, or try again in a moment.
            </div>
          ) : (
            <>
              <div
                className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-slate-100 p-1"
                role="tablist"
                aria-label="Billing period"
              >
                {DURATION_TAB_ORDER.map((key) => {
                  const count = plansByTab[key].length;
                  const selected = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      id={`change-plan-tab-${key}`}
                      aria-selected={selected}
                      aria-controls={`change-plan-panel-${key}`}
                      disabled={count === 0}
                      onClick={() => setActiveTab(key)}
                      className={`min-w-0 flex-1 rounded-lg px-2 py-2.5 text-center text-[13px] font-semibold transition-all sm:text-[14px] ${
                        count === 0
                          ? "cursor-not-allowed text-slate-400 opacity-50"
                          : selected
                            ? "bg-white text-[#212E42] shadow-sm ring-1 ring-slate-200/80"
                            : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                      }`}
                    >
                      {DURATION_TAB_LABELS[key]}
                    </button>
                  );
                })}
              </div>

              {DURATION_TAB_ORDER.map((key) => (
                <div
                  key={key}
                  id={`change-plan-panel-${key}`}
                  role="tabpanel"
                  hidden={activeTab !== key}
                  aria-labelledby={`change-plan-tab-${key}`}
                  className="flex flex-col gap-3"
                >
                  {activeTab === key && (
                    <div className="flex flex-col gap-3" role="list">
                      {plansByTab[key].length === 0 ? (
                        <p className="py-6 text-center text-[14px] text-[#76808F]">
                          No plans for this billing period.
                        </p>
                      ) : (
                        plansByTab[key].map((plan) => (
                          <ChangePlanPlanRow
                            key={plan.id}
                            plan={plan}
                            currentPlan={currentPlan}
                            loading={loading}
                            onChangePlan={onChangePlan}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}

              {otherDurationPlans.length > 0 && (
                <div className="mt-1 border-t border-gray-200 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Other billing periods
                  </p>
                  <div className="flex flex-col gap-3" role="list">
                    {otherDurationPlans.map((plan) => (
                      <ChangePlanPlanRow
                        key={plan.id}
                        plan={plan}
                        currentPlan={currentPlan}
                        loading={loading}
                        onChangePlan={onChangePlan}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-center">
          <button
            onClick={() => {
              onClose();
              onCancelSubscription();
            }}
            className="text-[#76808F] text-[14px] font-medium hover:text-[#EE4266] transition-colors underline decoration-gray-300 underline-offset-4"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePlanModal;
