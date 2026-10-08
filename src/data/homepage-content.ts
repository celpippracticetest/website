/**
 * Homepage numbers that appear in more than one place. Change them here only.
 */

/** Social-proof count, reused by the hero trust row and the reviews heading. */
export const HOMEPAGE_USER_COUNT = "70k+";

export type HeroStat = {
  /** Bold number; empty for text-only stats. */
  value: string;
  label: string;
  /** Whether the number comes before ("60 mock exams") or after ("AI scoring out of 12") the label. */
  valueFirst: boolean;
};

/** Hero stat list, in display order (icons are matched by position). */
export const HOMEPAGE_HERO_STATS: HeroStat[] = [
  { value: "60", label: "mock exams", valueFirst: true },
  { value: "3,000+", label: "sample tests", valueFirst: true },
  { value: "12", label: "AI scoring out of", valueFirst: false },
  { value: "", label: "Guides and tips", valueFirst: true },
];
