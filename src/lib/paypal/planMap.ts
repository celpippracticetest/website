import { safeStripePriceId } from "@/lib/checkoutCancelUrl";
import { getDb } from "@/lib/appDocumentsClient";

type PlanEntry = { paypalPlanId: string };

function normalizeEntry(value: unknown): PlanEntry | null {
  if (typeof value === "string" && value.trim().startsWith("P-")) {
    return { paypalPlanId: value.trim() };
  }
  if (value && typeof value === "object" && "paypalPlanId" in value) {
    const id = (value as { paypalPlanId?: unknown }).paypalPlanId;
    if (typeof id === "string" && id.trim().startsWith("P-")) {
      return { paypalPlanId: id.trim() };
    }
  }
  return null;
}

function loadMap(): Record<string, PlanEntry> {
  const raw = process.env.PAYPAL_SUBSCRIPTION_PLANS_JSON?.trim();
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, PlanEntry> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const priceId = safeStripePriceId(key);
      const entry = normalizeEntry(val);
      if (priceId && entry) {
        out[priceId] = entry;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Env JSON only (sync). Prefer {@link resolvePayPalPlanIdForStripePrice} for checkout. */
export function paypalPlanIdForStripePrice(stripePriceId: string): string | null {
  const safe = safeStripePriceId(stripePriceId);
  if (!safe) {
    return null;
  }
  return loadMap()[safe]?.paypalPlanId ?? null;
}

/**
 * Stripe price id → PayPal billing plan id: env map first, then `plans` collection (`paypalPlanId`).
 */
export async function resolvePayPalPlanIdForStripePrice(
  stripePriceId: string
): Promise<string | null> {
  const safe = safeStripePriceId(stripePriceId);
  if (!safe) {
    return null;
  }
  const fromEnv = loadMap()[safe]?.paypalPlanId;
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const db = await getDb();
    const doc = await db.collection("plans").findOne<{ paypalPlanId?: string }>(
      { stripePriceId: safe },
      { projection: { paypalPlanId: 1 } }
    );
    const id = doc?.paypalPlanId?.trim();
    if (id?.startsWith("P-")) {
      return id;
    }
  } catch {
    /* Document store unavailable in some environments */
  }
  return null;
}
