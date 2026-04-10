/** Refund challenge only enrolls from `/final-offer` when this is posted with checkout. */
export const FINAL_OFFER_CHALLENGE_SOURCE = "final_offer" as const;

export type FinalOfferChallengeTierKey = "60d_50pct" | "30d_100pct";

export const FINAL_OFFER_CHALLENGE_TIERS: Record<
  FinalOfferChallengeTierKey,
  { windowDays: 60 | 30; refundPercent: 50 | 100; shortLabel: string; competitiveLabel: string }
> = {
  "60d_50pct": {
    windowDays: 60,
    refundPercent: 50,
    shortLabel: "Standard track",
    competitiveLabel: "More time, 50% refund if you clear the bar",
  },
  "30d_100pct": {
    windowDays: 30,
    refundPercent: 100,
    shortLabel: "Elite sprint",
    competitiveLabel: "Tighter deadline — 100% refund if you hit the target first",
  },
};

export function isValidFinalOfferChallengeCombo(
  windowDays: number,
  refundPercent: number
): boolean {
  return (
    (windowDays === 60 && refundPercent === 50) ||
    (windowDays === 30 && refundPercent === 100)
  );
}

export function tierKeyFromCombo(
  windowDays: number,
  refundPercent: number
): FinalOfferChallengeTierKey | null {
  if (windowDays === 60 && refundPercent === 50) return "60d_50pct";
  if (windowDays === 30 && refundPercent === 100) return "30d_100pct";
  return null;
}
