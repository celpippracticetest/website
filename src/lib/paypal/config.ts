/** Client ID + secret only (used for API calls and CMS plan creation). */
export function paypalApiCredentialsConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim()
  );
}

/** Public checkout: PayPal is available when credentials are set; plan id comes from CMS or env JSON. */
export function paypalSubscriptionsConfigured(): boolean {
  return paypalApiCredentialsConfigured();
}

export function paypalApiBase(): string {
  const raw = process.env.PAYPAL_API_BASE?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return "https://api-m.sandbox.paypal.com";
}
