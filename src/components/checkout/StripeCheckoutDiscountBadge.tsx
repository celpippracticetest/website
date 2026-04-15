"use client";

/**
 * Corner badge for Stripe-hosted checkout buttons when an auto-applied discount applies.
 * Parent should be `position: relative` with default overflow so the badge is not clipped.
 */
export function StripeCheckoutDiscountBadge({
  label,
}: {
  label: string | null | undefined;
}) {
  if (!label) return null;
  return (
    <span
      className="pointer-events-none absolute -right-1 -top-2.5 z-[5] whitespace-nowrap rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md ring-2 ring-white"
      aria-hidden
    >
      {label}
    </span>
  );
}
