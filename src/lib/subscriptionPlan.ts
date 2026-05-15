/**
 * Paid `publicMetadata.plan` values synced from Stripe / admin.
 * Used to hide pricing / upgrade CTAs for subscribers.
 */
export function isPaidSubscriptionPlan(plan: unknown): boolean {
  return String(plan ?? "").toLowerCase() === "plus";
}
