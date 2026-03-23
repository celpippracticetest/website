export function normalizePlan(plan: string | null | undefined) {
  return (plan || "").trim().toLowerCase();
}

const PREMIUM_PLUS_GRANDFATHER_CUTOFF = new Date("2026-03-24T00:00:00.000Z");

function parsePurchaseDate(purchaseDate: unknown) {
  if (!purchaseDate) return null;
  const date =
    purchaseDate instanceof Date ? purchaseDate : new Date(String(purchaseDate));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isGrandfatheredPremium(
  plan: string | null | undefined,
  purchaseDate?: unknown
) {
  if (normalizePlan(plan) !== "premium") {
    return false;
  }

  const parsedPurchaseDate = parsePurchaseDate(purchaseDate);

  // Treat legacy premium users without a recorded purchase date as full-access.
  if (!parsedPurchaseDate) {
    return true;
  }

  return parsedPurchaseDate < PREMIUM_PLUS_GRANDFATHER_CUTOFF;
}

export function hasPaidPracticeAccess(
  plan: string | null | undefined,
  purchaseDate?: unknown
) {
  const normalizedPlan = normalizePlan(plan);
  return (
    isGrandfatheredPremium(plan, purchaseDate) ||
    normalizedPlan === "premium" ||
    normalizedPlan === "pro" ||
    normalizedPlan === "enterprise"
  );
}

export function hasPremiumPlusAccess(
  plan: string | null | undefined,
  purchaseDate?: unknown
) {
  const normalizedPlan = normalizePlan(plan);
  return (
    isGrandfatheredPremium(plan, purchaseDate) ||
    normalizedPlan === "pro" ||
    normalizedPlan === "enterprise"
  );
}

export function getSubscriptionDisplayName(
  plan: string | null | undefined,
  purchaseDate?: unknown,
  currentName?: string | null
) {
  const normalizedPlan = normalizePlan(plan);
  const trimmedName = (currentName || "").trim();
  const hasPlusAccess = hasPremiumPlusAccess(plan, purchaseDate);

  if (trimmedName) {
    if (hasPlusAccess) {
      if (/premium plus/i.test(trimmedName)) {
        return trimmedName;
      }
      if (/\bpro\b/i.test(trimmedName)) {
        return trimmedName.replace(/\bpro\b/gi, "Premium Plus");
      }
      if (/premium/i.test(trimmedName)) {
        return trimmedName.replace(/premium/gi, "Premium Plus");
      }
      return `Premium Plus - ${trimmedName}`;
    }

    if (normalizedPlan === "premium") {
      if (/premium plus/i.test(trimmedName)) {
        return trimmedName.replace(/premium plus/gi, "Premium");
      }
      if (/\bpro\b/i.test(trimmedName)) {
        return trimmedName.replace(/\bpro\b/gi, "Premium");
      }
      return trimmedName;
    }

    return trimmedName;
  }

  if (normalizedPlan === "enterprise") return "Enterprise";
  if (hasPlusAccess) return "Premium Plus";
  if (normalizedPlan === "premium") return "Premium";
  if (normalizedPlan === "free") return "Free";
  return "Free";
}
