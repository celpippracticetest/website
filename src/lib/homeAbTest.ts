export const HOME_AB_COOKIE = "home_ab_variant";

/**
 * Homepage variants (historical; live site uses `passport` only):
 * - `classic` — style 1: redesign (legacy cookie / attribution only)
 * - `passport` — style 2: modern diagnostic + prep grid (current default)
 * - `legacy` — style 3: original legacy hero (legacy cookie / attribution only)
 */
export const HOME_AB_VARIANTS = ["classic", "passport", "legacy"] as const;
export type HomeAbVariant = (typeof HOME_AB_VARIANTS)[number];

/** Historical experiment arms (style 2 vs 3); attribution and CMS reports may still reference these. */
export const HOME_AB_EXPERIMENT_VARIANTS = ["passport", "legacy"] as const;
export type HomeAbExperimentVariant =
  (typeof HOME_AB_EXPERIMENT_VARIANTS)[number];

export function isHomeAbExperimentVariant(
  value: string | undefined,
): value is HomeAbExperimentVariant {
  return value === "passport" || value === "legacy";
}

export function isHomeAbVariant(value: string | undefined): value is HomeAbVariant {
  return value === "classic" || value === "passport" || value === "legacy";
}

/** Fallback when cookie is missing/invalid (middleware normally sets the real arm). */
export function parseHomeAbVariant(value: string | undefined): HomeAbVariant {
  return isHomeAbVariant(value) ? value : "passport";
}

type HomeStylePreviewParams = {
  /** @deprecated Prefer `s` — kept for older links */
  home?: string | null;
  /** `s=1` style 1 (classic), `s=2` style 2 (passport), `s=3` style 3 (legacy) */
  s?: string | null;
};

/**
 * Preview only (no longer wired on `/`; kept for tooling or old links). Does not change the
 * assignment cookie; exclude from A/B metrics when tracking.
 */
export function parseHomeStylePreviewQuery(params: HomeStylePreviewParams): HomeAbVariant | null {
  const s = params.s?.trim();
  if (s === "1") return "classic";
  if (s === "2") return "passport";
  if (s === "3") return "legacy";
  const home = params.home?.trim();
  if (home === "1") return "classic";
  if (home === "2") return "passport";
  if (home === "3") return "legacy";
  return null;
}

export const HOME_AB_EVENT_TYPES = ["page_view", "checkout_started", "purchase"] as const;
export type HomeAbEventType = (typeof HOME_AB_EVENT_TYPES)[number];

export function isHomeAbEventType(value: unknown): value is HomeAbEventType {
  return typeof value === "string" && (HOME_AB_EVENT_TYPES as readonly string[]).includes(value);
}
