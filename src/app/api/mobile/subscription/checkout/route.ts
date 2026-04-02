import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";


import { requireAuthenticatedRequest } from "@/lib/auth/request-auth";
import { stripe } from "@/lib/stripe";

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

async function resolvePromotionCode(
  request: NextRequest,
  userId: string,
  email: string,
  metadata: UserMetadata
): Promise<{ promotionCode: string | null; referralDiscountApplied: boolean }> {
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
          };
        }
      }
    } catch (error) {
      console.error("Failed to apply referral discount for mobile", error);
    }
  }

  return {
    promotionCode: null,
    referralDiscountApplied: false,
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
    const { user, userId } = await requireAuthenticatedRequest(request);
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
    const { promotionCode, referralDiscountApplied } =
      await resolvePromotionCode(request, userId, email, publicMetadata);
    const baseUrl = getBaseAppUrl(request);
    const attributionMetadata = {
      utm_source:
        readStringValue(body?.utm_source) ||
        readStringValue(lastTouch.source) ||
        readStringValue(publicMetadata.utm_source) ||
        "",
      utm_medium:
        readStringValue(body?.utm_medium) ||
        readStringValue(lastTouch.medium) ||
        readStringValue(publicMetadata.utm_medium) ||
        "",
      utm_campaign:
        readStringValue(body?.utm_campaign) ||
        readStringValue(lastTouch.campaign) ||
        readStringValue(publicMetadata.utm_campaign) ||
        "",
      utm_content:
        readStringValue(body?.utm_content) ||
        readStringValue(lastTouch.content) ||
        readStringValue(publicMetadata.utm_content) ||
        "",
      utm_term:
        readStringValue(body?.utm_term) ||
        readStringValue(lastTouch.term) ||
        readStringValue(publicMetadata.utm_term) ||
        "",
      gclid:
        readStringValue(body?.gclid) ||
        readStringValue(lastTouch.gclid) ||
        readStringValue(publicMetadata.gclid) ||
        "",
    };
    const attributionSnapshot = {
      attribution_source:
        attributionMetadata.utm_source ||
        (attributionMetadata.gclid ? "google_ads" : "direct"),
      attribution_medium: attributionMetadata.utm_medium,
      attribution_campaign: attributionMetadata.utm_campaign,
      attribution_gclid: attributionMetadata.gclid,
      entry_page:
        readStringValue(body?.entry_page) ||
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

    const session = await stripe.checkout.sessions.create({
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
        origin: "mobile_app",
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
                origin: "mobile_app",
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

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        planCancelled: false,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[mobile subscription checkout]", error);

    const message =
      error instanceof Error ? error.message : "Failed to create checkout.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
