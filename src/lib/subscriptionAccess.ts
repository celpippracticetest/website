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

/**
 * Canonical Mongo ObjectId string for access checks. URLs use `exam_<id>`; Clerk/Stripe may store either form.
 */
export function normalizeMockExamIdForAccess(id: string | null | undefined): string | null {
  if (id == null) return null;
  const t = String(id).trim();
  if (!t) return null;
  const stripped = /^exam_/i.test(t) ? t.replace(/^exam_/i, "") : t;
  const core = stripped.trim();
  if (!core) return null;
  if (/^[0-9a-f]{24}$/i.test(core)) {
    return core.toLowerCase();
  }
  return core;
}

/** Normalize Clerk `publicMetadata.purchasedMockExamIds` (array, JSON string, comma-separated, or odd shapes). */
export function coercePurchasedMockExamIds(raw: unknown): string[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        const n = normalizeMockExamIdForAccess(item);
        if (n) out.push(n);
      }
    }
    return out;
  }

  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        return coercePurchasedMockExamIds(JSON.parse(t) as unknown);
      } catch {
        /* fall through */
      }
    }
    return t
      .split(",")
      .map((s) => normalizeMockExamIdForAccess(s.trim()))
      .filter((s): s is string => s != null && s.length > 0);
  }

  if (typeof raw === "object") {
    return coercePurchasedMockExamIds(Object.values(raw as Record<string, unknown>));
  }

  return [];
}

/** True when this exam is unlocked because its id is in `purchasedMockExamIds` (à la carte), not only via plan tier. */
export function isMockExamUnlockedViaPurchase(
  examId: string | null | undefined,
  purchasedMockExamIds?: unknown
): boolean {
  const normalizedExamId = normalizeMockExamIdForAccess(examId ?? undefined);
  if (!normalizedExamId) return false;
  return coercePurchasedMockExamIds(purchasedMockExamIds).includes(normalizedExamId);
}

/** Full mock exam access: Plus/Enterprise for all exams; Premium only for the first ready exam (catalog order). */
export function hasMockExamAccess(
  plan: string | null | undefined,
  purchaseDate: unknown,
  examId: string | null | undefined,
  firstReadyExamId: string | null | undefined,
  purchasedMockExamIds?: unknown
) {
  const normalizedExamId = normalizeMockExamIdForAccess(examId ?? undefined);
  const purchasedIds = coercePurchasedMockExamIds(purchasedMockExamIds);
  if (normalizedExamId && purchasedIds.includes(normalizedExamId)) {
    return true;
  }
  if (hasPremiumPlusAccess(plan)) {
    return true;
  }
  const normalizedFirstReady = normalizeMockExamIdForAccess(firstReadyExamId ?? undefined);
  if (!normalizedExamId || !normalizedFirstReady || normalizedExamId !== normalizedFirstReady) {
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
