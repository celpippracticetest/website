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

function readTrimmedString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function pickFromObjects(
  objects: Array<Record<string, unknown>>,
  ...keys: string[]
): string | undefined {
  for (const object of objects) {
    for (const key of keys) {
      const value = readTrimmedString(object[key]);
      if (value) return value;
    }
  }
  return undefined;
}

/** Build attribution fields from a stored user profile (publicMetadata + attribution touches). */
export function extractUserAttributionSources(
  user: Record<string, unknown>,
  userId: string
): Record<string, unknown> {
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const legacyPublicMetadata = (publicMetadata.clerk_public_metadata ??
    {}) as Record<string, unknown>;
  const attribution = (user.attribution ?? {}) as Record<string, unknown>;
  const firstTouch = (attribution.firstTouch ?? {}) as Record<string, unknown>;
  const lastTouch = (attribution.lastTouch ?? {}) as Record<string, unknown>;
  const objects = [publicMetadata, legacyPublicMetadata, lastTouch, firstTouch];

  const gclid = pickFromObjects(objects, "gclid");
  const utmSource = pickFromObjects(objects, "utm_source", "source");
  const utmMedium = pickFromObjects(objects, "utm_medium", "medium");
  const utmCampaign = pickFromObjects(objects, "utm_campaign", "campaign");

  return {
    user_id: userId,
    gclid,
    gbraid: pickFromObjects(objects, "gbraid"),
    wbraid: pickFromObjects(objects, "wbraid"),
    google_ads_campaign_id: pickFromObjects(
      objects,
      "google_ads_campaign_id",
      "googleAdsCampaignId"
    ),
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: pickFromObjects(objects, "utm_content", "content"),
    utm_term: pickFromObjects(objects, "utm_term", "term"),
    fbclid: pickFromObjects(objects, "fbclid"),
    msclkid: pickFromObjects(objects, "msclkid"),
    ttclid: pickFromObjects(objects, "ttclid"),
    attribution_source: utmSource ?? pickFromObjects(objects, "source"),
    attribution_medium: utmMedium ?? pickFromObjects(objects, "medium"),
    attribution_campaign: utmCampaign ?? pickFromObjects(objects, "campaign"),
    attribution_gclid: gclid,
    attribution_gbraid: pickFromObjects(objects, "gbraid"),
    attribution_wbraid: pickFromObjects(objects, "wbraid"),
    entry_page: pickFromObjects(objects, "entryPage", "entry_page"),
    referrer: pickFromObjects(objects, "referrer"),
  };
}

export function hasGoogleClickAttribution(metadata: Record<string, string | undefined>): boolean {
  return Boolean(
    readTrimmedString(metadata.gclid) ||
      readTrimmedString(metadata.attribution_gclid) ||
      readTrimmedString(metadata.gbraid) ||
      readTrimmedString(metadata.attribution_gbraid) ||
      readTrimmedString(metadata.wbraid) ||
      readTrimmedString(metadata.attribution_wbraid)
  );
}

export function userHasStoredAttribution(sources: Record<string, unknown>): boolean {
  const metadata = buildChargeAttributionMetadata(sources);
  return Object.values(metadata).some((value) => readTrimmedString(value));
}

/** Fill only empty Stripe metadata keys — never overwrite existing attribution. */
export function mergeAttributionIntoStripeMetadata(
  existing: Record<string, string | undefined>,
  sources: Record<string, unknown>
): Stripe.MetadataParam {
  const attribution = buildChargeAttributionMetadata(sources);
  const merged: Stripe.MetadataParam = {};
  for (const [key, value] of Object.entries(existing)) {
    if (readTrimmedString(value)) merged[key] = value as string;
  }
  for (const [key, value] of Object.entries(attribution)) {
    if (!readTrimmedString(value)) continue;
    if (readTrimmedString(merged[key])) continue;
    merged[key] = value;
  }
  return merged;
}
