/**
 * Google Ads conversion IDs for dataLayer (GTM reads these). Tag + conversions live in GTM.
 * NEXT_PUBLIC_* overrides for staging or account changes.
 */
export const GOOGLE_ADS_CONVERSION_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "AW-18023374877";

export const GOOGLE_ADS_SIGNUP_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL || "MS1TCM2B0I0cEJ3Am5JD";

/** Subscribe / first-purchase conversion (Google Ads name: Subscribe). */
export const GOOGLE_ADS_SUBSCRIBE_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_LABEL || "J73VCKnZxo0cEJ3Am5JD";
