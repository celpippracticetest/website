import React from "react";
import SvgCloseCircle from "@/components/icons/CloseCircle";
import SvgCheckCircle from "@/components/icons/CheckCircle";

interface Plan {
  id: string; // Product ID
  name: string;
  priceId: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  metadata?: Record<string, string>;
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
  if (!isOpen) return null;

  // Sort plans by amount
  const sortedPlans = [...availablePlans].sort((a, b) => a.amount - b.amount);

  const currentPlan = availablePlans.find((p) => {
    if (currentPriceId) return p.priceId === currentPriceId;
    if (currentPlanName) {
      const lowerName = currentPlanName.toLowerCase();
      return (
        lowerName.includes(p.name.toLowerCase()) ||
        (p.interval === "month" &&
          lowerName.includes("monthly")) ||
        (p.interval === "year" &&
          lowerName.includes("yearly")) ||
        (p.interval === "week" &&
          lowerName.includes("weekly")) ||
        (p.interval === "month" &&
          p.intervalCount === 3 &&
          lowerName.includes("3 months"))
      );
    }
    return false;
  });

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
            Change Your Plan
          </h2>
          <p className="text-[#76808F] text-[14px]">
            Choose the plan that best fits your needs.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {availablePlans.length === 0 && loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading available plans...
            </div>
          ) : (
            sortedPlans.map((plan) => {
              let isCurrent = false;

              if (currentPriceId) {
                isCurrent = plan.priceId === currentPriceId;
              } else if (currentPlanName) {
                // Fallback to name matching
                const lowerName = currentPlanName.toLowerCase();
                const planLowerName = plan.name.toLowerCase();

                isCurrent =
                  lowerName.includes(planLowerName) ||
                  (plan.interval === "month" &&
                    lowerName.includes("monthly")) ||
                  (plan.interval === "year" &&
                    lowerName.includes("yearly")) ||
                  (plan.interval === "week" &&
                    lowerName.includes("weekly")) ||
                  (plan.interval === "month" &&
                    plan.intervalCount === 3 &&
                    lowerName.includes("3 months"));
              }

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
                  key={plan.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    isCurrent
                      ? "border-[#4A7DFF] bg-[#F2F6FF] opacity-80 cursor-default"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <h3 className="text-[#212E42] font-semibold text-[16px]">
                      {plan.name}
                    </h3>
                    <div className="text-[#76808F] text-[14px]">
                      ${plan.amount.toFixed(2)} /{" "}
                      {plan.intervalCount && plan.intervalCount > 1
                        ? `${plan.intervalCount} ${plan.interval}s`
                        : plan.interval}
                    </div>
                  </div>

                  {isCurrent ? (
                    <div className="flex items-center gap-2 text-[#4A7DFF] font-medium text-[14px]">
                      <SvgCheckCircle className="w-5 h-5" /> Your Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => onChangePlan(plan.priceId)}
                      disabled={loading}
                      className={`px-4 py-2 cursor-pointer rounded-full font-medium text-[14px] transition-colors disabled:opacity-50 ${
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
            })
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
