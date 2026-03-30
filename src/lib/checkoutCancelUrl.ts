/**
 * Stripe cancel_url for Checkout — includes optional returnTo (pathname only)
 * so the failed page can send users back to pricing / landing without open redirects,
 * plus the line item so "Try again" can POST straight back to Checkout.
 */
export function buildCheckoutCancelUrl(
  origin: string,
  purchasePage: string | null,
  stripeLine?: { priceId: string } | { productId: string }
): string {
  const url = new URL("/failed", origin);
  url.searchParams.set("canceled", "true");
  const safe = safeInternalReturnPath(purchasePage);
  if (safe) {
    url.searchParams.set("returnTo", safe);
  }
  if (stripeLine && "priceId" in stripeLine) {
    const pid = safeStripePriceId(stripeLine.priceId);
    if (pid) url.searchParams.set("price", pid);
  } else if (stripeLine && "productId" in stripeLine) {
    const prod = safeStripeProductId(stripeLine.productId);
    if (prod) url.searchParams.set("product", prod);
  }
  return `${url.pathname}${url.search}`;
}

export function safeInternalReturnPath(path: string | null | undefined): string | null {
  if (!path || typeof path !== "string") return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
}

export function safeStripePriceId(id: string | null | undefined): string | null {
  if (!id || typeof id !== "string") return null;
  const t = id.trim();
  if (!/^price_[a-zA-Z0-9]+$/.test(t)) return null;
  return t;
}

export function safeStripeProductId(id: string | null | undefined): string | null {
  if (!id || typeof id !== "string") return null;
  const t = id.trim();
  if (!/^prod_[a-zA-Z0-9]+$/.test(t)) return null;
  return t;
}
