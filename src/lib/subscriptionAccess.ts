export function normalizePlan(plan: string | null | undefined) {
  return (plan || "").trim().toLowerCase();
}

/**
 * Heuristic on Stripe/CMS **product titles** (not user `publicMetadata.plan`).
 * Used when inferring display/upgrades from plan names.
 */
export function planNameIndicatesPremiumPlus(planName: string | null | undefined) {
  const lower = (planName || "").trim().toLowerCase();
  if (!lower) return false;
  return lower.includes("pro") || /\bplus\b/.test(lower);
}

/** Paid subscriber: `plus` after migration; legacy `premium` / `pro` / `enterprise` still honored. */
export function hasPaidPracticeAccess(
  plan: string | null | undefined,
  _purchaseDate?: unknown
) {
  const normalized = normalizePlan(plan);
  return (
    normalized === "plus" ||
    normalized === "premium" ||
    normalized === "pro" ||
    normalized === "enterprise"
  );
}

/** CMS admin display label aligned with DB plan tokens (`plus`, legacy `premium`/`pro`, etc.). */
export function formatPlanLabel(
  plan?: string | null,
  planType?: string | null
) {
  if (!hasPaidPracticeAccess(plan)) return "Free";
  const normalized = normalizePlan(plan);
  const label =
    normalized === "plus"
      ? "Plus"
      : normalized.charAt(0).toUpperCase() + normalized.slice(1);
  const type = (planType || "").trim();
  return type ? `${label} (${type})` : label;
}

/** Same as {@link hasPaidPracticeAccess} — kept for call sites that distinguish “full library” gating. */
export function hasPremiumPlusAccess(
  plan: string | null | undefined,
  purchaseDate?: unknown
) {
  return hasPaidPracticeAccess(plan, purchaseDate);
}

/**
 * Canonical ObjectId string for access checks. URLs use `exam_<id>`; auth/Stripe may store either form.
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
  return null;
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

/**
 * Full mock exam access for paid `plus`, or per-exam purchase.
 * `firstReadyExamId` is kept for call-site compatibility.
 */
export function hasMockExamAccess(
  plan: string | null | undefined,
  purchaseDate: unknown,
  examId: string | null | undefined,
  _firstReadyExamId: string | null | undefined,
  purchasedMockExamIds?: unknown
) {
  const normalizedExamId = normalizeMockExamIdForAccess(examId ?? undefined);
  const purchasedIds = coercePurchasedMockExamIds(purchasedMockExamIds);
  if (normalizedExamId && purchasedIds.includes(normalizedExamId)) {
    return true;
  }
  return hasPaidPracticeAccess(plan, purchaseDate);
}

/**
 * Stripe / checkout plan titles shown in profile and change-plan.
 */
export function formatSubscriptionLabelForDisplay(
  raw: string | null | undefined,
  preserveLegacyPremiumWord = false
): string {
  const s = (raw || "").trim();
  if (!s) return "";
  let out = s.replace(/\bpremium\s*plus\b/gi, "Plus");
  out = out.replace(/\bpro\b/gi, "Plus");
  if (!preserveLegacyPremiumWord) {
    out = out.replace(/\bpremium\b/gi, "Plus");
  }
  return out;
}

export function getSubscriptionDisplayName(
  plan: string | null | undefined,
  _purchaseDate?: unknown,
  currentName?: string | null
) {
  const normalizedPlan = normalizePlan(plan);
  const trimmedName = (currentName || "").trim();
  const paid = hasPaidPracticeAccess(plan);

  if (trimmedName) {
    if (paid) {
      return formatSubscriptionLabelForDisplay(trimmedName) || "Plus";
    }
    return trimmedName;
  }

  if (paid) return "Plus";
  if (normalizedPlan === "free") return "Free";
  return "Free";
}
