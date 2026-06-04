export const UI_AB_COOKIE = "site_ui_variant";

/** `classic` = cd9786d-era UI; `modern` = current redesign (default). */
export const UI_AB_VARIANTS = ["classic", "modern"] as const;
export type UiAbVariant = (typeof UI_AB_VARIANTS)[number];

export function isUiAbVariant(value: string | undefined): value is UiAbVariant {
  return value === "classic" || value === "modern";
}

export function parseUiAbVariant(value: string | undefined): UiAbVariant {
  return isUiAbVariant(value) ? value : "modern";
}

/**
 * Ad / preview assignment: `S=0` or `s=0` → classic, `S=1` or `s=1` → modern.
 * Only `0` and `1` are recognized (legacy home preview used `s=2` / `s=3`).
 */
export function parseUiAbFromQuery(s: string | null | undefined): UiAbVariant | null {
  const t = s?.trim();
  if (t === "0") return "classic";
  if (t === "1") return "modern";
  return null;
}

/** Reads site UI assignment from `S` or `s` query params (case-insensitive key). */
export function readUiAbQueryParam(
  searchParams: Pick<URLSearchParams, "get" | "has">,
): UiAbVariant | null {
  return (
    parseUiAbFromQuery(searchParams.get("S")) ??
    parseUiAbFromQuery(searchParams.get("s"))
  );
}

export function stripUiAbQueryParams(url: URL): void {
  url.searchParams.delete("S");
  url.searchParams.delete("s");
}

export const UI_AB_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export const UI_AB_EVENT_TYPES = ["page_view", "checkout_started", "purchase"] as const;
export type UiAbEventType = (typeof UI_AB_EVENT_TYPES)[number];

export function isUiAbEventType(value: unknown): value is UiAbEventType {
  return typeof value === "string" && (UI_AB_EVENT_TYPES as readonly string[]).includes(value);
}

export const UI_AB_HEADER = "x-ui-variant";

export type UiAbMiddlewareResult = {
  variant: UiAbVariant;
  /** Redirect to same path without `S` after assignment. */
  stripQueryRedirect: URL | null;
  shouldSetCookie: boolean;
};

export function resolveUiAbMiddleware(req: {
  nextUrl: URL;
  cookies: { get: (name: string) => { value: string } | undefined };
}): UiAbMiddlewareResult {
  const fromQuery = readUiAbQueryParam(req.nextUrl.searchParams);
  const existingRaw = req.cookies.get(UI_AB_COOKIE)?.value;
  const existing = isUiAbVariant(existingRaw) ? existingRaw : null;

  let variant: UiAbVariant;
  let shouldSetCookie = false;

  // Explicit ?S= / ?s= always assigns (ad deep links + local testing).
  if (fromQuery) {
    variant = fromQuery;
    shouldSetCookie = variant !== existing;
  } else if (existing) {
    variant = existing;
  } else {
    variant = "modern";
  }

  let stripQueryRedirect: URL | null = null;
  if (
    fromQuery !== null &&
    (req.nextUrl.searchParams.has("S") || req.nextUrl.searchParams.has("s"))
  ) {
    const url = req.nextUrl.clone();
    stripUiAbQueryParams(url);
    stripQueryRedirect = url;
  }

  return { variant, stripQueryRedirect, shouldSetCookie };
}
