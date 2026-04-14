import { NextRequest, NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { stripeCheckoutPaymentMethodParams } from "@/lib/stripeCheckoutPaymentMethods";
import { captureException, logger, trackAPICall } from "@/lib/sentry-logger";
import { getDb } from "@/lib/mongodb";
import { isPricingAbLayout } from "@/lib/pricingAbTest";
import { isHomeAbExperimentVariant, isHomeAbVariant } from "@/lib/homeAbTest";
import {
  buildCheckoutCancelUrl,
  safeStripePriceId,
  safeStripeProductId,
} from "@/lib/checkoutCancelUrl";
import { resolveCampaignPromoFromRequest } from "@/lib/campaignPromo";
import {
  ACQUISITION_ATTRIBUTION_COOKIE,
  flatAcquisitionFromCookie,
} from "@/lib/attributionCookie";

/**
 * GET — browser navigation uses GET. Reuse the same checkout logic as POST
 * (do not `fetch` this route from the server: it deadlocks the dev server and
 * yields ERR_INVALID_RESPONSE in Chrome).
 */
export async function GET(req: NextRequest) {
  const price = safeStripePriceId(req.nextUrl.searchParams.get("price"));
  const product = safeStripeProductId(req.nextUrl.searchParams.get("product"));

  if (!price && !product) {
    return NextResponse.redirect(new URL("/landing/express-entry", req.url), 302);
  }

  return guestCheckoutResponse(req);
}

/**
 * Guest checkout: no Clerk session required. Stripe collects email; webhook links
 * or creates the Clerk user and applies plan metadata.
 */
export async function POST(req: NextRequest) {
  return guestCheckoutResponse(req);
}

async function guestCheckoutResponse(req: NextRequest): Promise<NextResponse> {
  try {
    const product: string | null = req.nextUrl.searchParams.get("product");
    const price: string | null = req.nextUrl.searchParams.get("price");
    const purchaseType: string | null = req.nextUrl.searchParams.get("purchase_type");
    const mockExamIdRaw: string | null = req.nextUrl.searchParams.get("mock_exam_id");
    const mockExamId =
      typeof mockExamIdRaw === "string" && /^[a-f0-9]{24}$/i.test(mockExamIdRaw)
        ? mockExamIdRaw
        : null;
    const formData =
      req.method === "GET" || req.method === "HEAD"
        ? new FormData()
        : await req.formData();

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    if (!product && !price) {
      return NextResponse.json(
        { error: "Product ID or Price ID is required" },
        { status: 400 },
      );
    }

    let priceId: string;
    let priceObject;
    let productDetails;

    if (price) {
      priceId = price;
      priceObject = await stripe.prices.retrieve(priceId);
      const productId =
        typeof priceObject.product === "string"
          ? priceObject.product
          : priceObject.product.id;
      productDetails = await stripe.products.retrieve(productId);
    } else {
      productDetails = await stripe.products.retrieve(product!);
      if (!productDetails.default_price) {
        return NextResponse.json(
          { error: "Product does not have a default price" },
          { status: 400 },
        );
      }

      priceId = productDetails.default_price as string;
      priceObject = await stripe.prices.retrieve(priceId);
    }

    const mode = priceObject.recurring ? "subscription" : "payment";

    const referrer = req.headers.get("referer");
    let purchasePage: string | null = null;
    if (referrer) {
      try {
        purchasePage = new URL(referrer).pathname;
      } catch {
        purchasePage = referrer;
      }
    }
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      null;

    const readRequestAttribution = (field: string) => {
      const formValue = formData.get(field);
      if (typeof formValue === "string" && formValue.trim()) {
        return formValue.trim();
      }

      const queryValue = req.nextUrl.searchParams.get(field);
      if (queryValue?.trim()) {
        return queryValue.trim();
      }

      return null;
    };

    const acqCk = flatAcquisitionFromCookie(
      req.cookies.get(ACQUISITION_ATTRIBUTION_COOKIE)?.value
    );

    const attributionMetadata = {
      utm_source: readRequestAttribution("utm_source") || acqCk.utm_source || "",
      utm_medium: readRequestAttribution("utm_medium") || acqCk.utm_medium || "",
      utm_campaign: readRequestAttribution("utm_campaign") || acqCk.utm_campaign || "",
      utm_content: readRequestAttribution("utm_content") || acqCk.utm_content || "",
      utm_term: readRequestAttribution("utm_term") || acqCk.utm_term || "",
      gclid: readRequestAttribution("gclid") || acqCk.gclid || "",
    };

    const campaignPromo = await resolveCampaignPromoFromRequest(req);
    const campaignPromoKey = campaignPromo.campaignKey;
    const campaignPromotionCode = campaignPromo.promotionCode;

    const attributionSnapshot = {
      attribution_source:
        attributionMetadata.utm_source || (attributionMetadata.gclid ? "google_ads" : "direct"),
      attribution_medium: attributionMetadata.utm_medium ?? "",
      attribution_campaign: attributionMetadata.utm_campaign ?? "",
      attribution_gclid: attributionMetadata.gclid ?? "",
      entry_page:
        readRequestAttribution("entry_page") || acqCk.entry_page || "",
      referrer: readRequestAttribution("referrer") ?? "",
      attribution_session_id: readRequestAttribution("attribution_session_id") ?? "",
      purchase_page: purchasePage ?? "",
      attribution_country: country ?? "",
      attribution_currency: priceObject.currency?.toUpperCase() ?? "",
      time_to_purchase_minutes: "",
      coupon_id: "",
      promotion_code_id: campaignPromotionCode ?? "",
      campaign_promo_key: campaignPromoKey ?? "",
    };

    const pricingAbLayoutRaw = readRequestAttribution("pricing_ab_layout");
    const pricingAbLayoutCandidate = pricingAbLayoutRaw ?? undefined;
    const pricingAbLayout = isPricingAbLayout(pricingAbLayoutCandidate)
      ? pricingAbLayoutCandidate
      : null;
    const pricingAbMeta: Record<string, string> =
      pricingAbLayout !== null ? { pricing_ab_layout: pricingAbLayout } : {};

    if (pricingAbLayout) {
      try {
        const db = await getDb();
        await db.collection("pricing_ab_events").insertOne({
          eventType: "checkout_started",
          layout: pricingAbLayout,
          userId: null,
          priceId,
          planName: productDetails.name,
          guestCheckout: true,
          createdAt: new Date(),
        });
      } catch (abErr) {
        console.error("pricing_ab checkout_started (guest) log failed:", abErr);
      }
    }

    const homeAbRaw = readRequestAttribution("home_ab_variant");
    const homeAbVariant = isHomeAbVariant(homeAbRaw ?? undefined) ? homeAbRaw : null;
    const homeAbMeta: Record<string, string> =
      homeAbVariant !== null ? { home_ab_variant: homeAbVariant } : {};

    if (homeAbVariant && isHomeAbExperimentVariant(homeAbVariant)) {
      try {
        const db = await getDb();
        await db.collection("home_ab_events").insertOne({
          eventType: "checkout_started",
          variant: homeAbVariant,
          userId: null,
          priceId,
          planName: productDetails.name,
          guestCheckout: true,
          createdAt: new Date(),
        });
      } catch (abErr) {
        console.error("home_ab checkout_started (guest) log failed:", abErr);
      }
    }

    logger.info("Creating guest checkout session", {
      component: "checkout_session_guest_api",
      action: "create_guest_checkout_session",
      metadata: { priceId, campaignPromoKey },
    });

    const guestCheckoutDiscounts: Array<{ promotion_code: string }> = [];
    if (campaignPromotionCode) {
      guestCheckoutDiscounts.push({ promotion_code: campaignPromotionCode });
    }

    const session = await stripe.checkout.sessions.create({
      ...stripeCheckoutPaymentMethodParams(),
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: buildCheckoutCancelUrl(origin, purchasePage, { priceId }),

      automatic_tax: { enabled: true },
      ...(guestCheckoutDiscounts.length === 0 ? { allow_promotion_codes: true } : {}),
      ...(guestCheckoutDiscounts.length > 0 ? { discounts: guestCheckoutDiscounts } : {}),
      metadata: {
        guest_checkout: "true",
        plan_name: productDetails.name,
        purchase_type: purchaseType || null,
        mock_exam_id: mockExamId,
        referral_code: "",
        ...(campaignPromoKey && { campaign_promo: campaignPromoKey }),
        ...attributionMetadata,
        ...attributionSnapshot,
        ...pricingAbMeta,
        ...homeAbMeta,
      },
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: {
            guest_checkout: "true",
            plan_name: productDetails.name,
            purchase_type: purchaseType || null,
            mock_exam_id: mockExamId,
            referral_code: "",
            ...(campaignPromoKey && { campaign_promo: campaignPromoKey }),
            ...attributionMetadata,
            ...attributionSnapshot,
            ...pricingAbMeta,
            ...homeAbMeta,
          },
        },
      }),
    });

    trackAPICall("POST", "/api/checkout_session/guest", 200, {
      sessionId: session.id,
    });

    return NextResponse.redirect(session.url!, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    captureException(err, {
      component: "checkout_session_guest_api",
      action: "guest_checkout_session_error",
    });

    const message = err instanceof Error ? err.message : "Checkout failed";
    const status =
      err && typeof err === "object" && "statusCode" in err && typeof (err as any).statusCode === "number"
        ? (err as any).statusCode
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
