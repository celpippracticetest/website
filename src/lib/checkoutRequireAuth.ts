import { safeInternalReturnPath } from "@/lib/checkoutCancelUrl";

/** Checkout API base when auth state is known; empty while loading, null when signed out. */
export function getSignedCheckoutSessionBase(
  isLoaded: boolean,
  isSignedIn: boolean,
): string | null | "" {
  if (!isLoaded) return "";
  return isSignedIn ? "/api/checkout_session" : null;
}

export function buildSignUpUrlForCheckout(returnPath?: string | null): string {
  const fallback = "/pricing";
  let safe = safeInternalReturnPath(returnPath ?? undefined);
  if (!safe && typeof window !== "undefined") {
    safe = safeInternalReturnPath(
      `${window.location.pathname}${window.location.search}`,
    );
  }
  const qs = new URLSearchParams({
    redirect_url: safe ?? fallback,
  });
  return `/sign-up?${qs.toString()}`;
}

export function redirectToSignUpForCheckout(returnPath?: string | null): void {
  window.location.assign(buildSignUpUrlForCheckout(returnPath));
}
