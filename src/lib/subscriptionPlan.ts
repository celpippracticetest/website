/**
 * Paid `publicMetadata.plan` values synced from Stripe / admin.
 * Used to hide pricing / upgrade CTAs for subscribers.
 */
export function isPaidSubscriptionPlan(plan: unknown): boolean {
  const normalized = String(plan ?? "").trim().toLowerCase();
  return (
    normalized === "plus" ||
    normalized === "premium" ||
    normalized === "pro" ||
    normalized === "enterprise"
  );
}
