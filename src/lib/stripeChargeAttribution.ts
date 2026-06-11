import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";

export function recordToStripeMetadata(
  record: Record<string, unknown>
): Stripe.MetadataParam {
  const out: Stripe.MetadataParam = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    out[key] = value === null ? "" : String(value);
  }
  return out;
}

function pickAttributionValue(
  sources: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = sources[key];
    if (value === undefined || value === null) continue;
    const trimmed = String(value).trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

/** Compact metadata stamped on PaymentIntents and Charges for campaign ROAS joins. */
export function buildChargeAttributionMetadata(
  sources: Record<string, unknown>
): Stripe.MetadataParam {
  return recordToStripeMetadata({
    gclid: pickAttributionValue(sources, "gclid", "attribution_gclid"),
    gbraid: pickAttributionValue(sources, "gbraid", "attribution_gbraid"),
    wbraid: pickAttributionValue(sources, "wbraid", "attribution_wbraid"),
    google_ads_campaign_id: pickAttributionValue(sources, "google_ads_campaign_id"),
    utm_source: pickAttributionValue(sources, "utm_source", "attribution_source"),
    utm_medium: pickAttributionValue(sources, "utm_medium", "attribution_medium"),
    utm_campaign: pickAttributionValue(sources, "utm_campaign", "attribution_campaign"),
    utm_content: pickAttributionValue(sources, "utm_content"),
    utm_term: pickAttributionValue(sources, "utm_term"),
    fbclid: pickAttributionValue(sources, "fbclid", "attribution_fbclid"),
    msclkid: pickAttributionValue(sources, "msclkid", "attribution_msclkid"),
    ttclid: pickAttributionValue(sources, "ttclid", "attribution_ttclid"),
    user_id: pickAttributionValue(sources, "user_id"),
    purchase_page: pickAttributionValue(sources, "purchase_page"),
    entry_page: pickAttributionValue(sources, "entry_page"),
    ga4_client_id: pickAttributionValue(sources, "ga4_client_id"),
    ga4_session_id: pickAttributionValue(sources, "ga4_session_id"),
  });
}

export async function stampPaymentIntentAttribution(
  paymentIntentId: string,
  metadata: Stripe.MetadataParam,
  extras?: Record<string, string>
): Promise<void> {
  const merged = recordToStripeMetadata({ ...metadata, ...extras });
  if (Object.keys(merged).length === 0) return;

  await stripe.paymentIntents.update(paymentIntentId, { metadata: merged });

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const chargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;

  if (chargeId) {
    await stripe.charges.update(chargeId, { metadata: merged });
  }
}

export function resolvePaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null | undefined
): string | null {
  if (!paymentIntent) return null;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}
