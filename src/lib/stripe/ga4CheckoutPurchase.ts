import Stripe from "stripe";
import documentsClient from "@/lib/appDocumentsClient";
import {
  sendGa4Events,
  type Ga4ItemParam,
} from "@/lib/ga4MeasurementProtocol";
import { logger } from "@/lib/sentry-logger";

const GA4_PURCHASE_DEDUPE_COLLECTION = "ga4_purchase_dedupe";
const DEFAULT_CURRENCY = "CAD";

function readMetadataValue(
  metadata: Record<string, string | undefined> | null | undefined,
  key: string
): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function inferAttributionSource(
  metadata: Record<string, string | undefined> | null | undefined
): string {
  const utmSource = readMetadataValue(metadata, "utm_source");
  if (utmSource) return utmSource;

  const gclid = readMetadataValue(metadata, "gclid");
  const gbraid = readMetadataValue(metadata, "gbraid");
  const wbraid = readMetadataValue(metadata, "wbraid");
  if (gclid || gbraid || wbraid) return "google";
  if (readMetadataValue(metadata, "msclkid")) return "bing";
  if (readMetadataValue(metadata, "fbclid")) return "facebook";
  if (readMetadataValue(metadata, "ttclid")) return "tiktok";
  if (readMetadataValue(metadata, "referrer")) return "referral";
  return "(direct)";
}

function inferAttributionMedium(
  metadata: Record<string, string | undefined> | null | undefined
): string {
  const utmMedium = readMetadataValue(metadata, "utm_medium");
  if (utmMedium) return utmMedium;

  const gclid = readMetadataValue(metadata, "gclid");
  const gbraid = readMetadataValue(metadata, "gbraid");
  const wbraid = readMetadataValue(metadata, "wbraid");
  const msclkid = readMetadataValue(metadata, "msclkid");
  const fbclid = readMetadataValue(metadata, "fbclid");
  const ttclid = readMetadataValue(metadata, "ttclid");
  if (gclid || gbraid || wbraid || msclkid || fbclid || ttclid) return "cpc";
  if (readMetadataValue(metadata, "referrer")) return "referral";
  return "(none)";
}

function buildGa4AttributionParams(
  metadata: Record<string, string | undefined> | null | undefined
): Record<string, string> {
  const gclid = readMetadataValue(metadata, "gclid") || "";
  const gbraid = readMetadataValue(metadata, "gbraid") || "";
  const wbraid = readMetadataValue(metadata, "wbraid") || "";
  const fbclid = readMetadataValue(metadata, "fbclid") || "";
  const msclkid = readMetadataValue(metadata, "msclkid") || "";
  const ttclid = readMetadataValue(metadata, "ttclid") || "";
  const utmCampaignRaw = readMetadataValue(metadata, "utm_campaign");
  const googleAdsCampaignId = readMetadataValue(metadata, "google_ads_campaign_id");
  const attributionCampaign = readMetadataValue(metadata, "attribution_campaign");
  const effectiveCampaign =
    (utmCampaignRaw && utmCampaignRaw !== "(not set)" ? utmCampaignRaw : null) ||
    (attributionCampaign && attributionCampaign !== "(not set)" ? attributionCampaign : null) ||
    googleAdsCampaignId ||
    utmCampaignRaw ||
    "";

  return {
    source: inferAttributionSource(metadata),
    medium: inferAttributionMedium(metadata),
    campaign: effectiveCampaign,
    utm_source: readMetadataValue(metadata, "utm_source") || "",
    utm_medium: readMetadataValue(metadata, "utm_medium") || "",
    utm_campaign: effectiveCampaign,
    utm_content: readMetadataValue(metadata, "utm_content") || "",
    utm_term: readMetadataValue(metadata, "utm_term") || "",
    gclid,
    gbraid,
    wbraid,
    fbclid,
    msclkid,
    ttclid,
    attribution_gclid: gclid,
    attribution_gbraid: gbraid,
    attribution_wbraid: wbraid,
    attribution_fbclid: fbclid,
    attribution_msclkid: msclkid,
    attribution_ttclid: ttclid,
    attribution_session_id:
      readMetadataValue(metadata, "attribution_session_id") || "",
    purchase_page: readMetadataValue(metadata, "purchase_page") || "",
    entry_page: readMetadataValue(metadata, "entry_page") || "",
  };
}

/** GA4 MP client_id must look like `<int>.<int>` when possible. */
function buildGa4ClientId(args: {
  metadata?: Record<string, string | undefined> | null;
  customerId?: string | null;
  userId?: string | null;
  sessionId: string;
  subscriptionId?: string | null;
}): string {
  const ga4ClientId = readMetadataValue(args.metadata ?? undefined, "ga4_client_id");
  if (ga4ClientId && /^\d+\.\d+$/.test(ga4ClientId)) {
    return ga4ClientId;
  }

  const stableKey =
    readMetadataValue(args.metadata ?? undefined, "attribution_session_id") ||
    args.userId ||
    args.customerId ||
    args.subscriptionId ||
    args.sessionId;

  let hash = 0;
  for (let i = 0; i < stableKey.length; i += 1) {
    hash = (hash * 31 + stableKey.charCodeAt(i)) >>> 0;
  }
  const partA = (hash % 1_000_000_000) + 1_000_000_000;
  const partB = ((hash ^ stableKey.length) % 1_000_000_000) + 1_000_000_000;
  return `${partA}.${partB}`;
}

function readGa4SessionId(
  metadata: Record<string, string | undefined> | null | undefined
): string | undefined {
  return readMetadataValue(metadata, "ga4_session_id") ?? undefined;
}

/** Stripe amounts are in minor units (cents); GA4 expects major units (dollars). */
export function resolveCheckoutValueMajor(session: Stripe.Checkout.Session): number {
  if (typeof session.amount_total === "number") {
    return roundMoneyMajor(session.amount_total / 100);
  }

  const lineItems = session.line_items?.data;
  if (lineItems?.length) {
    const cents = lineItems.reduce(
      (sum, item) => sum + (typeof item.amount_total === "number" ? item.amount_total : 0),
      0
    );
    if (cents > 0) return roundMoneyMajor(cents / 100);
  }

  if (typeof session.amount_subtotal === "number") {
    return roundMoneyMajor(session.amount_subtotal / 100);
  }

  return 0;
}

export function resolveCheckoutCurrency(session: Stripe.Checkout.Session): string {
  const raw = session.currency?.trim();
  return raw ? raw.toUpperCase() : DEFAULT_CURRENCY;
}

function roundMoneyMajor(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildCheckoutPurchaseItems(
  session: Stripe.Checkout.Session,
  metadata: Record<string, string | undefined>,
  valueMajor: number
): Ga4ItemParam[] {
  const lineItems = session.line_items?.data;
  if (lineItems?.length) {
    return lineItems.map((item, index) => {
      const itemValueMajor =
        typeof item.amount_total === "number"
          ? roundMoneyMajor(item.amount_total / 100)
          : valueMajor;
      const product = item.price?.product;
      const productId =
        typeof product === "string"
          ? product
          : product && typeof product === "object" && "id" in product
            ? String(product.id)
            : undefined;
      return {
        item_id: (productId || readMetadataValue(metadata, "plan_name") || `item_${index + 1}`).slice(
          0,
          100
        ),
        item_name: (
          item.description ||
          readMetadataValue(metadata, "plan_name") ||
          "CELPIP Plan"
        ).slice(0, 100),
        price: itemValueMajor,
        quantity: item.quantity || 1,
        item_category: "Subscription",
      };
    });
  }

  const planName = readMetadataValue(metadata, "plan_name") || "CELPIP Plan";
  const mockId = readMetadataValue(metadata, "mock_exam_id");
  const itemId =
    mockId ||
    readMetadataValue(metadata, "plan_name") ||
    (session.mode === "subscription" ? "subscription" : "checkout");

  return [
    {
      item_id: itemId.slice(0, 100),
      item_name: planName.slice(0, 100),
      price: valueMajor,
      quantity: 1,
      item_category: "Subscription",
    },
  ];
}

export function isCheckoutSessionPaid(session: Stripe.Checkout.Session): boolean {
  const status = session.payment_status;
  return status === "paid" || status === "no_payment_required";
}

export async function hydrateCheckoutSessionForGa4(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<Stripe.Checkout.Session> {
  const needsLineItems =
    session.amount_total == null ||
    !session.line_items?.data?.length;
  if (!needsLineItems) return session;

  return stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price.product"],
  });
}

async function claimGa4PurchaseTransaction(transactionId: string): Promise<boolean> {
  try {
    const db = await documentsClient.db();
    const result = await db.collection(GA4_PURCHASE_DEDUPE_COLLECTION).updateOne(
      { transactionId },
      { $setOnInsert: { transactionId, createdAt: new Date() } },
      { upsert: true }
    );
    return result.upsertedCount === 1;
  } catch (error) {
    logger.error("GA4 purchase dedupe claim failed", {
      component: "ga4_checkout_purchase",
      action: "dedupe_claim_failed",
      metadata: { transactionId, error },
    });
    return true;
  }
}

async function releaseGa4PurchaseTransaction(transactionId: string): Promise<void> {
  try {
    const db = await documentsClient.db();
    await db.collection(GA4_PURCHASE_DEDUPE_COLLECTION).deleteOne({ transactionId });
  } catch {
    // Best-effort so Stripe webhook retries can resend MP.
  }
}

export type SendGa4CheckoutPurchaseResult =
  | { sent: true; transactionId: string; value: number; currency: string }
  | { sent: false; reason: string; transactionId?: string };

/**
 * Send GA4 `purchase` via Measurement Protocol for a paid Checkout Session.
 * Uses `session.id` as `transaction_id` (deduped server-side + by GA4).
 */
export async function sendGa4CheckoutPurchaseFromSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  metadata: Record<string, string | undefined>
): Promise<SendGa4CheckoutPurchaseResult> {
  const transactionId = session.id;

  if (!isCheckoutSessionPaid(session)) {
    return {
      sent: false,
      reason: `payment_status_${session.payment_status || "unknown"}`,
      transactionId,
    };
  }

  const claimed = await claimGa4PurchaseTransaction(transactionId);
  if (!claimed) {
    return { sent: false, reason: "duplicate_transaction", transactionId };
  }

  const hydrated = await hydrateCheckoutSessionForGa4(stripe, session);
  const value = resolveCheckoutValueMajor(hydrated);
  const currency = resolveCheckoutCurrency(hydrated);

  if (value <= 0 && hydrated.payment_status !== "no_payment_required") {
    logger.warn("GA4 purchase skipped: zero value on paid checkout", {
      component: "ga4_checkout_purchase",
      action: "zero_value",
      metadata: {
        transactionId,
        amountTotal: hydrated.amount_total,
        amountSubtotal: hydrated.amount_subtotal,
        paymentStatus: hydrated.payment_status,
      },
    });
    return { sent: false, reason: "zero_value", transactionId };
  }

  const checkoutPlanName = readMetadataValue(metadata, "plan_name");
  const purchaseType =
    readMetadataValue(metadata, "purchase_type") === "subscription_renewal"
      ? "subscription_renewal"
      : "first_purchase";

  const ok = await sendGa4Events({
    clientId: buildGa4ClientId({
      metadata,
      customerId: typeof hydrated.customer === "string" ? hydrated.customer : null,
      userId: readMetadataValue(metadata, "user_id"),
      sessionId: hydrated.id,
      subscriptionId:
        typeof hydrated.subscription === "string" ? hydrated.subscription : null,
    }),
    userId: readMetadataValue(metadata, "user_id") ?? undefined,
    gaSessionId: readGa4SessionId(metadata),
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: transactionId,
          value,
          currency,
          purchase_type: purchaseType,
          billing_mode:
            hydrated.mode === "subscription" ? "subscription" : "one_time",
          ...(checkoutPlanName ? { plan_name: checkoutPlanName } : {}),
          items: buildCheckoutPurchaseItems(hydrated, metadata, value),
          ...buildGa4AttributionParams(metadata),
        },
      },
    ],
  });

  if (!ok) {
    await releaseGa4PurchaseTransaction(transactionId);
    logger.error("GA4 purchase Measurement Protocol send failed", {
      component: "ga4_checkout_purchase",
      action: "mp_send_failed",
      metadata: { transactionId, value, currency },
    });
    return { sent: false, reason: "mp_send_failed", transactionId };
  }

  logger.info("GA4 purchase sent via Measurement Protocol", {
    component: "ga4_checkout_purchase",
    action: "purchase_sent",
    metadata: { transactionId, value, currency, purchaseType },
  });

  return { sent: true, transactionId, value, currency };
}
