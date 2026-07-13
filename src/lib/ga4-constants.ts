/**
 * GA4 measurement ID (public). Hardcoded default so browser + server analytics
 * keep sending to the correct property even when env vars are unset; the
 * NEXT_PUBLIC_* / server env values still override for staging or account changes.
 */
export const GA4_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
  process.env.GA_MEASUREMENT_ID?.trim() ||
  "G-S24BC0HY77";
