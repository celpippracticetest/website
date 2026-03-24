/**
 * Clerk `publicMetadata.plan` — paid values synced from Stripe / admin.
 * Used to hide pricing / upgrade CTAs for subscribers.
 */
export function isPaidClerkSubscriptionPlan(plan: unknown): boolean {
  const p = String(plan ?? "").toLowerCase();
  return (
    p === "premium" || p === "pro" || p === "plus" || p === "enterprise"
  );
}
