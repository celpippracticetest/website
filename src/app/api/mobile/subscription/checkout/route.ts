import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { stripeCheckoutPaymentMethodParams } from "@/lib/stripeCheckoutPaymentMethods";
import {
  ACQUISITION_ATTRIBUTION_COOKIE,
  flatAcquisitionFromCookie,
} from "@/lib/attributionCookie";

type UserMetadata = Record<string, unknown>;

function getBaseAppUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return "https://celpippracticetest.com";
}

function getMobileReturnUrl(baseUrl: string, status: string): string {
  return `${baseUrl}/mobile-checkout-complete?status=${encodeURIComponent(status)}`;
}

function getPrimaryEmailAddress(user: any): string | null {
  const primaryId = user.primaryEmailAddressId;
  const primary = user.emailAddresses?.find(
    (email: { id: string; emailAddress: string }) => email.id === primaryId
  );

  return primary?.emailAddress || user.emailAddresses?.[0]?.emailAddress || null;
}

function getAuthorizedPromotionId(metadata: UserMetadata): string | null {
  const promotionId = metadata.referralPromotionId;
  return typeof promotionId === "string" && promotionId.trim()
    ? promotionId.trim()
    : null;
}

function hasActiveReferralDiscount(metadata: UserMetadata): boolean {
  return (
    Boolean(metadata.referralCode) &&
    metadata.referralActive !== false &&
    metadata.referralDiscountActive !== false &&
    metadata.referralDiscountUsed !== true
  );
}

function hasActivePartnerRefereeDiscount(metadata: UserMetadata): boolean {
  return (
    Boolean(metadata.partnerReferralPromotionId) &&
    metadata.partnerReferralDiscountUsed !== true &&
    metadata.partnerReferralDiscountActive !== false &&
    Boolean(metadata.partnerId)
  );
}

async function resolvePromotionCode(
  request: NextRequest,
  userId: string,
  email: string,
  metadata: UserMetadata
): Promise<{
  promotionCode: string | null;
  referralDiscountApplied: boolean;
  partnerDiscountApplied: boolean;
}> {
  const referralPromotionId = getAuthorizedPromotionId(metadata);
  const baseUrl = getBaseAppUrl(request);

  if (referralPromotionId && hasActiveReferralDiscount(metadata)) {
    let isExpired = false;

    const expiryValue = metadata.referralDiscountExpiry;
    if (typeof expiryValue === "string" && expiryValue.trim()) {
      const expiryDate = new Date(expiryValue);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate <= new Date()) {
        isExpired = true;
      }
    }

    if (!isExpired) {
      try {
        const promotionCodeDetails =
          await stripe.promotionCodes.retrieve(referralPromotionId);
        const couponDetails =
          typeof promotionCodeDetails.coupon === "string"
            ? await stripe.coupons.retrieve(promotionCodeDetails.coupon)
            : promotionCodeDetails.coupon;

        if (
          couponDetails.redeem_by &&
          couponDetails.redeem_by < Math.floor(Date.now() / 1000)
        ) {
          isExpired = true;
        }
      } catch (error) {
        console.error("Failed to validate referral discount", error);
        isExpired = true;
      }
    }

    if (!isExpired) {
      return {
        promotionCode: referralPromotionId,
        referralDiscountApplied: true,
        partnerDiscountApplied: false,
      };
    }
  }

  if (metadata.referralCode && !referralPromotionId) {
    try {
      const response = await fetch(`${baseUrl}/api/referrals/apply-discount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralCode: metadata.referralCode,
          userId,
          userEmail: email,
        }),
      });

      if (response.ok) {
        const client = await clerkClient();
        const refreshedUser = await client.users.getUser(userId);
        const refreshedPromotionId = getAuthorizedPromotionId(
          (refreshedUser.publicMetadata ?? {}) as UserMetadata
        );

        if (refreshedPromotionId) {
          return {
            promotionCode: refreshedPromotionId,
            referralDiscountApplied: true,
            partnerDiscountApplied: false,
          };
        }
      }
    } catch (error) {
      console.error("Failed to apply referral discount for mobile", error);
    }
  }

  const partnerPromoId =
    typeof metadata.partnerReferralPromotionId === "string"
      ? metadata.partnerReferralPromotionId.trim()
      : "";
  if (partnerPromoId && hasActivePartnerRefereeDiscount(metadata)) {
    let isExpired = false;
    const expiryValue = metadata.partnerReferralDiscountExpiry;
    if (typeof expiryValue === "string" && expiryValue.trim()) {
      const expiryDate = new Date(expiryValue);
      if (!Number.isNaN(expiryDate.getTime()) && expiryDate <= new Date()) {
        isExpired = true;
      }
    }
    if (!isExpired) {
      try {
        const promotionCodeDetails =
          await stripe.promotionCodes.retrieve(partnerPromoId);
        const couponDetails =
          typeof promotionCodeDetails.coupon === "string"
            ? await stripe.coupons.retrieve(promotionCodeDetails.coupon)
            : promotionCodeDetails.coupon;
        if (
          couponDetails.redeem_by &&
          couponDetails.redeem_by < Math.floor(Date.now() / 1000)
        ) {
          isExpired = true;
        }
        if (!promotionCodeDetails.active) {
          isExpired = true;
        }
      } catch (error) {
        console.error("Failed to validate partner referee discount", error);
        isExpired = true;
      }
    }
    if (!isExpired) {
      return {
        promotionCode: partnerPromoId,
        referralDiscountApplied: false,
        partnerDiscountApplied: true,
      };
    }
  }

  return {
    promotionCode: null,
    referralDiscountApplied: false,
    partnerDiscountApplied: false,
  };
}

function toMetadataValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function readStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: NextRequest) {
  try {
    const { user, userId, mobileAuthKind } = await requireAuthenticatedRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const productId =
      typeof body?.productId === "string" ? body.productId.trim() : "";

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required." },
        { status: 400 }
      );
    }

    const email = getPrimaryEmailAddress(user);
    if (!email) {
      return NextResponse.json(
        { error: "Authenticated user does not have a primary email." },
        { status: 400 }
      );
    }

    const product = await stripe.products.retrieve(productId, {
      expand: ["default_price"],
    });
    const defaultPrice = product.default_price;

    if (!defaultPrice) {
      return NextResponse.json(
        { error: "Selected product does not have a default price." },
        { status: 400 }
      );
    }

    const price =
      typeof defaultPrice === "string"
        ? await stripe.prices.retrieve(defaultPrice)
        : (defaultPrice as Stripe.Price);
    const mode = price.recurring ? "subscription" : "payment";
    const publicMetadata = (user.publicMetadata ?? {}) as UserMetadata;
    const firstTouch =
      typeof publicMetadata.firstTouch === "object" && publicMetadata.firstTouch
        ? (publicMetadata.firstTouch as UserMetadata)
        : {};
    const lastTouch =
      typeof publicMetadata.lastTouch === "object" && publicMetadata.lastTouch
        ? (publicMetadata.lastTouch as UserMetadata)
        : {};
    const { promotionCode, referralDiscountApplied, partnerDiscountApplied } =
      await resolvePromotionCode(request, userId, email, publicMetadata);
    const baseUrl = getBaseAppUrl(request);
    const acqCk = flatAcquisitionFromCookie(
      request.cookies.get(ACQUISITION_ATTRIBUTION_COOKIE)?.value
    );
    const attributionMetadata = {
      utm_source:
        readStringValue(body?.utm_source) ||
        readStringValue(acqCk.utm_source) ||
        readStringValue(lastTouch.source) ||
        readStringValue(publicMetadata.utm_source) ||
        "",
      utm_medium:
        readStringValue(body?.utm_medium) ||
        readStringValue(acqCk.utm_medium) ||
        readStringValue(lastTouch.medium) ||
        readStringValue(publicMetadata.utm_medium) ||
        "",
      utm_campaign:
        readStringValue(body?.utm_campaign) ||
        readStringValue(acqCk.utm_campaign) ||
        readStringValue(body?.google_ads_campaign_id) ||
        readStringValue(acqCk.google_ads_campaign_id) ||
        readStringValue(lastTouch.campaign) ||
        readStringValue(publicMetadata.utm_campaign) ||
        "",
      google_ads_campaign_id:
        readStringValue(body?.google_ads_campaign_id) ||
        readStringValue(acqCk.google_ads_campaign_id) ||
        "",
      utm_content:
        readStringValue(body?.utm_content) ||
        readStringValue(acqCk.utm_content) ||
        readStringValue(lastTouch.content) ||
        readStringValue(publicMetadata.utm_content) ||
        "",
      utm_term:
        readStringValue(body?.utm_term) ||
        readStringValue(acqCk.utm_term) ||
        readStringValue(lastTouch.term) ||
        readStringValue(publicMetadata.utm_term) ||
        "",
      gclid:
        readStringValue(body?.gclid) ||
        readStringValue(acqCk.gclid) ||
        readStringValue(lastTouch.gclid) ||
        readStringValue(publicMetadata.gclid) ||
        "",
      gbraid:
        readStringValue(body?.gbraid) ||
        readStringValue(acqCk.gbraid) ||
        readStringValue(lastTouch.gbraid) ||
        readStringValue(publicMetadata.gbraid) ||
        "",
      wbraid:
        readStringValue(body?.wbraid) ||
        readStringValue(acqCk.wbraid) ||
        readStringValue(lastTouch.wbraid) ||
        readStringValue(publicMetadata.wbraid) ||
        "",
      fbclid:
        readStringValue(body?.fbclid) ||
        readStringValue(acqCk.fbclid) ||
        readStringValue(lastTouch.fbclid) ||
        readStringValue(publicMetadata.fbclid) ||
        "",
      msclkid:
        readStringValue(body?.msclkid) ||
        readStringValue(acqCk.msclkid) ||
        readStringValue(lastTouch.msclkid) ||
        readStringValue(publicMetadata.msclkid) ||
        "",
      ttclid:
        readStringValue(body?.ttclid) ||
        readStringValue(acqCk.ttclid) ||
        readStringValue(lastTouch.ttclid) ||
        readStringValue(publicMetadata.ttclid) ||
        "",
    };
    const inferredPaidSource =
      attributionMetadata.gclid || attributionMetadata.gbraid || attributionMetadata.wbraid
        ? "google_ads"
        : attributionMetadata.msclkid
          ? "microsoft_ads"
          : attributionMetadata.fbclid
            ? "meta_ads"
            : attributionMetadata.ttclid
              ? "tiktok_ads"
              : "direct";
    const attributionSnapshot = {
      attribution_source:
        attributionMetadata.utm_source || inferredPaidSource,
      attribution_medium: attributionMetadata.utm_medium,
      attribution_campaign:
        attributionMetadata.utm_campaign || attributionMetadata.google_ads_campaign_id,
      attribution_gclid: attributionMetadata.gclid,
      attribution_gbraid: attributionMetadata.gbraid,
      attribution_wbraid: attributionMetadata.wbraid,
      attribution_fbclid: attributionMetadata.fbclid,
      attribution_msclkid: attributionMetadata.msclkid,
      attribution_ttclid: attributionMetadata.ttclid,
      entry_page:
        readStringValue(body?.entry_page) ||
        readStringValue(acqCk.entry_page) ||
        readStringValue(firstTouch.entryPage) ||
        readStringValue(publicMetadata.entryPage) ||
        "",
      referrer:
        readStringValue(body?.referrer) ||
        readStringValue(firstTouch.referrer) ||
        readStringValue(lastTouch.referrer) ||
        "",
      attribution_session_id:
        readStringValue(body?.attribution_session_id) || "",
    };

    const ga4ClientId = readStringValue(body?.ga4_client_id);
    const ga4SessionId = readStringValue(body?.ga4_session_id);
    const ga4CheckoutMeta: Record<string, string> = {
      ...(ga4ClientId ? { ga4_client_id: ga4ClientId } : {}),
      ...(ga4SessionId ? { ga4_session_id: ga4SessionId } : {}),
    };

    const session = await stripe.checkout.sessions.create({
      ...stripeCheckoutPaymentMethodParams(),
      customer_email: email,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode,
      success_url:
        `${getMobileReturnUrl(baseUrl, "success")}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: getMobileReturnUrl(baseUrl, "cancel"),
      automatic_tax: { enabled: true },
      ...(promotionCode ? {} : { allow_promotion_codes: true }),
      ...(promotionCode
        ? { discounts: [{ promotion_code: promotionCode }] }
        : {}),
      metadata: {
        user_id: userId,
        plan_name: toMetadataValue(product.name),
        referral_code: toMetadataValue(publicMetadata.referralCode),
        referral_discount_applied: referralDiscountApplied
          ? toMetadataValue(publicMetadata.referralDiscount || "referral")
          : "",
        partner_ref_discount_applied: partnerDiscountApplied
          ? "partner_referee"
          : "",
        partner_referral_code: partnerDiscountApplied
          ? toMetadataValue(publicMetadata.partnerReferralCode)
          : "",
        origin: "mobile_app",
        ...ga4CheckoutMeta,
        ...attributionMetadata,
        ...attributionSnapshot,
      },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                user_id: userId,
                plan_name: toMetadataValue(product.name),
                referral_code: toMetadataValue(publicMetadata.referralCode),
                referral_discount_applied: referralDiscountApplied
                  ? toMetadataValue(publicMetadata.referralDiscount || "referral")
                  : "",
                partner_ref_discount_applied: partnerDiscountApplied
                  ? "partner_referee"
                  : "",
                partner_referral_code: partnerDiscountApplied
                  ? toMetadataValue(publicMetadata.partnerReferralCode)
                  : "",
                origin: "mobile_app",
                ...ga4CheckoutMeta,
                ...attributionMetadata,
                ...attributionSnapshot,
              },
            },
          }
        : {}),
    });

    if (mode === "subscription" && typeof session.subscription === "string") {
      await stripe.subscriptions.update(session.subscription, {
        metadata: {
          user_id: userId,
          checkout_id: session.id,
          origin: "mobile_app",
        },
      });
    }

    if (mobileAuthKind === "supabase") {
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data: existing } = await admin.auth.admin.getUserById(userId);
        const app = (existing.user?.app_metadata ?? {}) as Record<string, unknown>;
        await admin.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...app,
            planCancelled: false,
          },
        });
      }
    } else {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          planCancelled: false,
        },
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[mobile subscription checkout]", error);

    const message =
      error instanceof Error ? error.message : "Failed to create checkout.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
