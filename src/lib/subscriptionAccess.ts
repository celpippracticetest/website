export function normalizePlan(plan: string | null | undefined) {
  return (plan || "").trim().toLowerCase();
}

/**
 * Infer Premium Plus tier from Stripe/CMS product display names.
 * Matches legacy "pro" in the name and explicit "Plus" (e.g. "Premium Plus") — same tier as `publicMetadata.plan` `pro` / `plus`.
 */
export function planNameIndicatesPremiumPlus(planName: string | null | undefined) {
  const lower = (planName || "").trim().toLowerCase();
  if (!lower) return false;
  return lower.includes("pro") || /\bplus\b/.test(lower);
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
    normalizedPlan === "plus" ||
    normalizedPlan === "enterprise"
  );
}

export function hasPremiumPlusAccess(
  plan: string | null | undefined,
  _purchaseDate?: unknown
) {
  const normalizedPlan = normalizePlan(plan);
  return (
    normalizedPlan === "pro" ||
    normalizedPlan === "plus" ||
    normalizedPlan === "enterprise"
  );
}

/** Full mock exam access: Plus/Enterprise for all exams; Premium only for the first ready exam (catalog order). */
export function hasMockExamAccess(
  plan: string | null | undefined,
  purchaseDate: unknown,
  examId: string | null | undefined,
  firstReadyExamId: string | null | undefined,
  purchasedMockExamIds?: unknown
) {
  const purchasedIds = Array.isArray(purchasedMockExamIds)
    ? purchasedMockExamIds.filter((item): item is string => typeof item === "string")
    : [];
  if (examId && purchasedIds.includes(examId)) {
    return true;
  }
  if (hasPremiumPlusAccess(plan)) {
    return true;
  }
  if (!examId || !firstReadyExamId || examId !== firstReadyExamId) {
    return false;
  }
  return hasPaidPracticeAccess(plan, purchaseDate);
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
