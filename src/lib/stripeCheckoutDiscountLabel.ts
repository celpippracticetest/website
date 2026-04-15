/**
 * Client-side mirror of signed `/api/checkout_session` auto-discount rules we can infer
 * without HttpOnly cookies (campaign promos are server-only).
 */

export function isReferralStripeAutoDiscountEligible(
  publicMetadata: Record<string, unknown> | null | undefined,
  now: Date = new Date()
): boolean {
  if (!publicMetadata || typeof publicMetadata !== "object") return false;
  if (publicMetadata.referralDiscountUsed === true) return false;
  if (publicMetadata.referralActive === false) return false;
  if (publicMetadata.referralDiscountActive === false) return false;
  const code = publicMetadata.referralCode;
  if (typeof code !== "string" || !code.trim()) return false;
  const exp = publicMetadata.referralDiscountExpiry;
  if (typeof exp === "string" && exp.trim()) {
    const d = new Date(exp);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now.getTime()) return false;
  }
  return true;
}

export type StripeCheckoutAutoDiscountOptions = {
  userPublicMetadata?: unknown;
  /** Final-offer (non-challenge) checkout applies 20% off the first period on Stripe when no referral promo wins. */
  finalOfferFirstPeriod?: boolean;
};

/** Short label shown on Stripe checkout CTAs (not PayPal). */
export function getStripeCheckoutAutoDiscountLabel(
  opts: StripeCheckoutAutoDiscountOptions,
  now: Date = new Date()
): string | null {
  const meta =
    opts.userPublicMetadata && typeof opts.userPublicMetadata === "object"
      ? (opts.userPublicMetadata as Record<string, unknown>)
      : undefined;
  if (isReferralStripeAutoDiscountEligible(meta, now)) {
    return "20% off";
  }
  if (opts.finalOfferFirstPeriod) {
    return "20% off";
  }
  return null;
}
