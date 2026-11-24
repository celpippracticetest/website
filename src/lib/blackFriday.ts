/**
 * Black Friday 2026 — TEMPORARY. Revert everything named `blackFriday` /
 * `BlackFriday` on Mon 2026-11-30 (owner request, see docs/black-friday-2026.md).
 *
 * 50% off the FIRST payment (Stripe coupon `duration: "once"`, so renewals are
 * full price), applied automatically at checkout, for visitors whose IP
 * country is CA/US/AU and who have never paid. Everyone else keeps the
 * existing plan-discount A/B test.
 *
 * Client-safe: no server imports.
 */

export const BLACK_FRIDAY_PERCENT = 50;

/** Nov 29, 11:59:59 PM Eastern (EST = UTC-5). */
export const BLACK_FRIDAY_ENDS_AT_MS = Date.parse("2026-11-30T04:59:59Z");

export const BLACK_FRIDAY_COUNTRIES: ReadonlySet<string> = new Set(["CA", "US", "AU"]);

export function isBlackFridayActive(nowMs: number = Date.now()): boolean {
  return nowMs <= BLACK_FRIDAY_ENDS_AT_MS;
}

export function isBlackFridayCountry(country: string | null | undefined): boolean {
  return Boolean(country && BLACK_FRIDAY_COUNTRIES.has(country.trim().toUpperCase()));
}

export type CountdownParts = {
  days: string;
  hours: string;
  mins: string;
  secs: string;
  ended: boolean;
};

export function blackFridayCountdown(nowMs: number): CountdownParts {
  const s = Math.max(0, Math.floor((BLACK_FRIDAY_ENDS_AT_MS - nowMs) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    days: pad(Math.floor(s / 86400)),
    hours: pad(Math.floor((s % 86400) / 3600)),
    mins: pad(Math.floor((s % 3600) / 60)),
    secs: pad(s % 60),
    ended: s === 0,
  };
}
