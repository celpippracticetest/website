import { Plan, PlanBillingInterval } from "@/models/plans.model";

type RecurringConfig = {
    interval: PlanBillingInterval;
    interval_count: number;
};

const VALID_INTERVALS: PlanBillingInterval[] = ["day", "week", "month", "year"];

function isValidBillingInterval(value: unknown): value is PlanBillingInterval {
    return typeof value === "string" && VALID_INTERVALS.includes(value as PlanBillingInterval);
}

export function parseBillingIntervalCount(value: unknown, fallback = 1) {
    const numericValue = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(numericValue) || numericValue < 1) return fallback;
    return numericValue;
}

export function inferPlanRecurringConfig(
    plan: Pick<Plan, "title" | "planTitle" | "type">
): RecurringConfig {
    const planText = `${plan.title} ${plan.planTitle} ${plan.type}`.toLowerCase();

    if (planText.includes("weekly")) {
        return { interval: "week", interval_count: 1 };
    }
    if (planText.includes("3 month") || planText.includes("3-month") || planText.includes("best seller")) {
        return { interval: "month", interval_count: 3 };
    }
    if (planText.includes("12 month") || planText.includes("12-month") || planText.includes("yearly") || planText.includes("best value")) {
        return { interval: "year", interval_count: 1 };
    }

    return { interval: "month", interval_count: 1 };
}

export function getPlanRecurringConfig(
    plan: Pick<Plan, "title" | "planTitle" | "type" | "billingInterval" | "billingIntervalCount">
): RecurringConfig {
    if (isValidBillingInterval(plan.billingInterval)) {
        return {
            interval: plan.billingInterval,
            interval_count: parseBillingIntervalCount(plan.billingIntervalCount, 1),
        };
    }

    return inferPlanRecurringConfig(plan);
}

export function formatPlanRecurringLabel(
    plan: Pick<Plan, "title" | "planTitle" | "type" | "billingInterval" | "billingIntervalCount">
) {
    const recurring = getPlanRecurringConfig(plan);
    const unit = recurring.interval_count === 1 ? recurring.interval : `${recurring.interval}s`;

    return recurring.interval_count === 1
        ? `Every ${recurring.interval}`
        : `Every ${recurring.interval_count} ${unit}`;
}
