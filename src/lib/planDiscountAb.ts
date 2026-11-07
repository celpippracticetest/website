import { SITEWIDE_PLAN_DISCOUNT_PERCENT } from "@/lib/sitewidePlanDiscount";

/** Sticky assignment: `a` = current prices, `b` = 30% off every plan. */
export const PLAN_DISCOUNT_AB_COOKIE = "plan_discount_ab";

export const PLAN_DISCOUNT_AB_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const PLAN_DISCOUNT_AB_VARIANTS = ["a", "b"] as const;
export type PlanDiscountAbVariant = (typeof PLAN_DISCOUNT_AB_VARIANTS)[number];

export function isPlanDiscountAbVariant(
  value: string | undefined | null,
): value is PlanDiscountAbVariant {
  return value === "a" || value === "b";
}

/**
 * Crawlers, link previews and monitors: kept out of the price test (always arm `a`, no cookie)
 * so they don't skew the split and search engines always see list prices. Names only, no bare
 * "bot", so phone models like "Cubot" are not caught.
 */
const NON_HUMAN_USER_AGENT =
  /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|bingbot|bingpreview|yandex(bot|images)|baiduspider|duckduckbot|slurp|applebot|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot|seznambot|facebookexternalhit|facebookcatalog|meta-externalagent|twitterbot|linkedinbot|pinterestbot|whatsapp|telegrambot|discordbot|slackbot|skypeuripreview|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-web|anthropic-ai|perplexitybot|ccbot|bytespider|amazonbot|headlesschrome|chrome-lighthouse|pingdom|uptimerobot|statuscake|crawler|spider|python-requests|curl\/|wget\//i;

export function isNonHumanUserAgent(userAgent: string | null | undefined): boolean {
  return Boolean(userAgent && NON_HUMAN_USER_AGENT.test(userAgent));
}

/** Random 50/50 assignment when the cookie is missing. */
export function pickPlanDiscountAbVariant(): PlanDiscountAbVariant {
  return Math.random() < 0.5 ? "a" : "b";
}

/**
 * QA override (`?plan_ab=a` current, `?plan_ab=b` 30% off).
 * Middleware writes this onto the sticky cookie so checkout matches the page.
 */
export function parsePlanDiscountPreviewQuery(
  value: string | null | undefined,
): PlanDiscountAbVariant | null {
  const t = value?.trim().toLowerCase();
  if (t === "a" || t === "1") return "a";
  if (t === "b" || t === "2") return "b";
  return null;
}

export function planDiscountPercent(variant: PlanDiscountAbVariant): number {
  return variant === "b" ? SITEWIDE_PLAN_DISCOUNT_PERCENT : 0;
}

/** Assigned arm from the browser cookie, or null when not assigned (e.g. bots). */
export function readBrowserPlanDiscountVariantOrNull(): PlanDiscountAbVariant | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    /(?:^|;\s*)plan_discount_ab=([^;]+)/,
  );
  const value = match?.[1]?.trim();
  return isPlanDiscountAbVariant(value) ? value : null;
}

export function readBrowserPlanDiscountVariant(): PlanDiscountAbVariant {
  return readBrowserPlanDiscountVariantOrNull() ?? "a";
}

export function upsertCookieHeader(
  cookieHeader: string,
  name: string,
  value: string,
): string {
  const parts = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith(`${name}=`));
  parts.push(`${name}=${value}`);
  return parts.join("; ");
}
