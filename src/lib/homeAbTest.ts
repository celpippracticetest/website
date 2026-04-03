export const HOME_AB_COOKIE = "home_ab_variant";

/**
 * Homepage variants (preview `/?s=1|2|3`):
 * - `classic` — style 1: redesign (not in random A/B; use `?s=1` or retain old cookie)
 * - `passport` — style 2: modern diagnostic + prep grid
 * - `legacy` — style 3: original legacy hero
 *
 * Live A/B test on `/` assigns only {@link HOME_AB_EXPERIMENT_VARIANTS} (50/50).
 */
export const HOME_AB_VARIANTS = ["classic", "passport", "legacy"] as const;
export type HomeAbVariant = (typeof HOME_AB_VARIANTS)[number];

/** Variants included in the homepage conversion experiment (style 2 vs 3). */
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
 * Preview only: `/?s=1|2|3` or `/?home=1|2|3`. Does not change the assignment cookie;
 * exclude from A/B metrics when tracking.
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
