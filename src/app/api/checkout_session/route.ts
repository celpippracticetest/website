import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { appUserAdmin, currentUser } from "@/lib/auth/server-auth";
import { logger, captureException, trackAPICall } from "@/lib/sentry-logger";
import { getDb } from "@/lib/appDocumentsClient";
import { isPricingAbLayout } from "@/lib/pricingAbTest";
import { isHomeAbExperimentVariant, isHomeAbVariant } from "@/lib/homeAbTest";
import {
  buildCheckoutCancelUrl,
  safeStripePriceId,
  safeStripeProductId,
} from "@/lib/checkoutCancelUrl";
import { resolveCampaignPromoFromRequest } from "@/lib/campaignPromo";
import {
  FINAL_OFFER_CHALLENGE_SOURCE,
  isValidFinalOfferChallengeCombo,
  tierKeyFromCombo,
} from "@/lib/finalOfferChallenge";
import { stripeCheckoutPaymentMethodParams } from "@/lib/stripeCheckoutPaymentMethods";
import {
  ACQUISITION_ATTRIBUTION_COOKIE,
  flatAcquisitionFromCookie,
} from "@/lib/attributionCookie";
import { isLikelySupabaseAuthUserId } from "@/lib/auth/supabase-mobile-user-bridge";
import {
  matchUsersCollectionByWebUserIds,
  supabaseAuthUserIdFieldsOnUserDoc,
} from "@/lib/users/userDocumentIdentity";

function recordToStripeMetadata(record: Record<string, unknown>): Stripe.MetadataParam {
  const out: Stripe.MetadataParam = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    out[key] = value === null ? "" : String(value);
  }
  return out;
}

/** GET — same handler as POST (no self-fetch: avoids dev deadlock / invalid response). */
export async function GET(req: NextRequest) {
  const price = safeStripePriceId(req.nextUrl.searchParams.get("price"));
  const product = safeStripeProductId(req.nextUrl.searchParams.get("product"));

  if (!price && !product) {
    return NextResponse.redirect(new URL("/pricing", req.url), 302);
  }

  return signedCheckoutResponse(req);
}

export async function POST(req: NextRequest) {
  return signedCheckoutResponse(req);
}

async function resolveFinalOfferCouponId(): Promise<string> {
  const configuredCouponId = process.env.STRIPE_FINAL_OFFER_COUPON_ID?.trim();
  if (configuredCouponId) {
    return configuredCouponId;
  }

  const coupon = await stripe.coupons.create({
    percent_off: 20,
    duration: "once",
    // Stripe coupon `name` max length is 40 characters.
    name: "Final offer 20% off 1st period",
    metadata: {
      source: "onboarding_final_chance",
    },
  });
  return coupon.id;
}

async function signedCheckoutResponse(req: NextRequest): Promise<NextResponse> {
  try {
    const product: string | null = req.nextUrl.searchParams.get("product");
    const price: string | null = req.nextUrl.searchParams.get("price");
    const purchaseType: string | null = req.nextUrl.searchParams.get("purchase_type");
    const mockExamIdRaw: string | null = req.nextUrl.searchParams.get("mock_exam_id");
    const mockExamIdLegacy =
      typeof mockExamIdRaw === "string" && /^[a-f0-9]{24}$/i.test(mockExamIdRaw)
        ? mockExamIdRaw
        : null;
    if (purchaseType === "mock_exam" || mockExamIdLegacy) {
      return NextResponse.redirect(new URL("/pricing", req.url), 302);
    }
    const formData =
      req.method === "GET" || req.method === "HEAD"
        ? new FormData()
        : await req.formData();
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authAdmin = await appUserAdmin();
    if (!product && !price) {
      return NextResponse.json(
        { error: "Product ID or Price ID is required" },
        { status: 400 }
      );
    }

    // Check if user has referral discount (prioritize referral over partner / campaign)
    const userMetadata = user.publicMetadata as any;
    let promotionCode: string | null = null;
    let referralDiscountApplied = false;
    let partnerDiscountApplied = false;

    // First check for referral discount (referralPromotionId)
    const referralPromotionId = userMetadata?.referralPromotionId;
    const newUserPromotionId = userMetadata?.promotionCodeId;

    logger.info("Checking referral discount for checkout", {
      component: "checkout_session_api",
      action: "check_referral_discount",
      userId: user.id,
      email,
      metadata: {
        hasReferralCode: !!userMetadata?.referralCode,
        hasReferralPromotion: !!referralPromotionId,
        referralActive: userMetadata?.referralActive,
      },
    });

    // Prioritize referral discount over NEW discount
    // Only apply referral discount if user actually signed up with a referral code
    if (
      referralPromotionId &&
      userMetadata?.referralCode && // User must have a referral code
      userMetadata?.referralActive !== false && // Allow undefined or true
      userMetadata?.referralDiscountActive !== false && // Allow undefined or true
      !userMetadata?.referralDiscountUsed
    ) {
      let isExpired = false;

      // Check both metadata expiry and actual Stripe coupon expiry
      if (userMetadata?.referralDiscountExpiry) {
        const expiryDate = new Date(userMetadata.referralDiscountExpiry);
        if (expiryDate <= new Date()) {
          isExpired = true;
        }
      }

      // Double-check with Stripe to ensure the coupon is still valid
      if (!isExpired) {
        try {
          const promotionCodeDetails = await stripe.promotionCodes.retrieve(referralPromotionId);
          const couponDetails = typeof promotionCodeDetails.coupon === 'string'
            ? await stripe.coupons.retrieve(promotionCodeDetails.coupon)
            : promotionCodeDetails.coupon;

          // Check if coupon has expired
          if (couponDetails.redeem_by && couponDetails.redeem_by < Math.floor(Date.now() / 1000)) {
            isExpired = true;
            console.log("❌ Referral discount has expired (verified via Stripe)");
          }
        } catch (error) {
          console.log("❌ Error checking referral discount validity:", error);
          isExpired = true;
        }
      }

      if (!isExpired) {
        promotionCode = referralPromotionId;
        referralDiscountApplied = true;
        logger.info(
          "Applying referral promotion code",
          {
            component: "checkout_session_api",
            action: "apply_referral_discount",
            userId: user.id,
            email,
            metadata: {
              promotionCodeId: referralPromotionId,
              referralCode: userMetadata.referralCode,
            },
          }
        );
      }
    } else if (userMetadata?.referralDiscountUsed) {
    } else if (userMetadata?.referralDiscountActive === false) {
    } else if (userMetadata?.referralActive === false) {
    } else if (!userMetadata?.referralCode) {
    } else if (userMetadata?.referralCode && !referralPromotionId) {
      // User has referral code but no promotion ID - try to apply discount

      try {
        const applyDiscountResponse = await fetch(
          `${origin}/api/referrals/apply-discount`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              referralCode: userMetadata.referralCode,
              userId: user.id,
              userEmail: email,
            }),
          }
        );

        if (applyDiscountResponse.ok) {
          // Refresh user metadata to get the new promotion ID
          const updatedUser = await authAdmin.users.getUser(user.id);
          const updatedMetadata = updatedUser.publicMetadata as any;
          const newReferralPromotionId = updatedMetadata?.referralPromotionId;

          if (newReferralPromotionId) {
            promotionCode = newReferralPromotionId;
            referralDiscountApplied = true;
          }
        } else {
          const errorData = await applyDiscountResponse.json();
          console.error("❌ Failed to apply referral discount:", errorData);
        }
      } catch (error) {
        console.error("❌ Error applying referral discount:", error);
      }
    }

    // Partner referee discount (Stripe promotion created at attribution)
    if (
      !promotionCode &&
      userMetadata?.partnerReferralPromotionId &&
      typeof userMetadata.partnerReferralPromotionId === "string" &&
      userMetadata?.partnerReferralDiscountUsed !== true &&
      userMetadata?.partnerReferralDiscountActive !== false &&
      userMetadata?.partnerId
    ) {
      let partnerExpired = false;
      if (userMetadata?.partnerReferralDiscountExpiry) {
        const exp = new Date(userMetadata.partnerReferralDiscountExpiry);
        if (!Number.isNaN(exp.getTime()) && exp <= new Date()) {
          partnerExpired = true;
        }
      }
      if (!partnerExpired) {
        try {
          const promoDetails = await stripe.promotionCodes.retrieve(
            userMetadata.partnerReferralPromotionId
          );
          const couponDetails =
            typeof promoDetails.coupon === "string"
              ? await stripe.coupons.retrieve(promoDetails.coupon)
              : promoDetails.coupon;
          if (
            couponDetails.redeem_by &&
            couponDetails.redeem_by < Math.floor(Date.now() / 1000)
          ) {
            partnerExpired = true;
          }
          if (!promoDetails.active) {
            partnerExpired = true;
          }
        } catch {
          partnerExpired = true;
        }
      }
      if (!partnerExpired) {
        promotionCode = userMetadata.partnerReferralPromotionId;
        partnerDiscountApplied = true;
        logger.info("Applying partner referee promotion", {
          component: "checkout_session_api",
          action: "apply_partner_referee_discount",
          userId: user.id,
          metadata: {
            partnerId: userMetadata.partnerId,
            partnerCode: userMetadata.partnerReferralCode,
          },
        });
      }
    }

    // Only apply NEW discount if no referral discount is available and user hasn't purchased before
    // if (
    //   !promotionCode &&
    //   newUserPromotionId &&
    //   !userMetadata?.hasEverPurchased
    // ) {
    //   // Check if NEW user discount is still valid (not expired)
    //   let isNewDiscountExpired = false;

    //   // Check if the promotion code is still valid by retrieving it from Stripe
    //   try {
    //     const promotionCodeDetails = await stripe.promotionCodes.retrieve(newUserPromotionId);
    //     const couponDetails = typeof promotionCodeDetails.coupon === 'string' 
    //       ? await stripe.coupons.retrieve(promotionCodeDetails.coupon)
    //       : promotionCodeDetails.coupon;

    //     // Check if coupon has expired
    //     if (couponDetails.redeem_by && couponDetails.redeem_by < Math.floor(Date.now() / 1000)) {
    //       isNewDiscountExpired = true;
    //       console.log("❌ NEW user discount has expired");
    //     }
    //   } catch (error) {
    //     console.log("❌ Error checking NEW user discount validity:", error);
    //     isNewDiscountExpired = true;
    //   }

    //   if (!isNewDiscountExpired) {
    //     promotionCode = newUserPromotionId;
    //     console.log(
    //       `✅ Applying NEW user promotion_code id: ${newUserPromotionId}`
    //     );
    //   } else {
    //     console.log("❌ NEW user discount has expired - proceeding without discount");
    //   }
    // } else if (userMetadata?.hasEverPurchased) {
    //   console.log(
    //     "❌ User has already made a purchase - no discount available"
    //   );
    // }

    let campaignPromoKey: string | null = null;
    if (!promotionCode) {
      const campaignPromo = await resolveCampaignPromoFromRequest(req);
      if (campaignPromo.promotionCode) {
        promotionCode = campaignPromo.promotionCode;
        campaignPromoKey = campaignPromo.campaignKey;
        logger.info("Applying campaign promo from cookie", {
          component: "checkout_session_api",
          action: "apply_campaign_promo",
          userId: user.id,
          metadata: { campaignKey: campaignPromoKey },
        });
      }
    }

    // Create checkout session from either a direct Stripe Price ID
    // (CMS-driven plans) or a fallback Product ID (legacy env-driven plans).
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
          { status: 400 }
        );
      }

      priceId = productDetails.default_price as string;
      priceObject = await stripe.prices.retrieve(priceId);
    }

    const mode = priceObject.recurring ? "subscription" : "payment";
    const db = await getDb();
    const userDoc = await db.collection("users").findOne(matchUsersCollectionByWebUserIds(user.id));
    const ud = userDoc as Record<string, unknown> | null;
    const attribution = (ud?.attribution ?? {}) as Record<string, unknown>;
    const lastTouch = (attribution.lastTouch ?? {}) as Record<string, unknown>;
    const firstTouch = (attribution.firstTouch ?? {}) as Record<string, unknown>;
    const publicMetaForCheckout = (ud?.publicMetadata ?? {}) as Record<string, unknown>;
    const firstTouchTimestamp =
      firstTouch.timestamp ||
      publicMetaForCheckout.acquisitionDate ||
      null;
    const firstTouchDate =
      firstTouchTimestamp != null && firstTouchTimestamp !== ""
        ? new Date(
            typeof firstTouchTimestamp === "string" || typeof firstTouchTimestamp === "number"
              ? firstTouchTimestamp
              : String(firstTouchTimestamp)
          )
        : null;
    const timeToPurchaseMinutes =
      firstTouchDate && !Number.isNaN(firstTouchDate.getTime())
        ? Math.max(0, Math.round((Date.now() - firstTouchDate.getTime()) / 60000))
        : null;
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
      lastTouch.country ||
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
    const challengeMode = readRequestAttribution("challenge_mode");
    const challengeTargetClbRaw = readRequestAttribution("challenge_target_clb");
    const challengeWindowDaysRaw = readRequestAttribution("challenge_window_days");
    const challengeOfferSourceRaw = readRequestAttribution("challenge_offer_source");
    const challengeRefundPercentRaw = readRequestAttribution("challenge_refund_percent");
    const challengeTargetClb = challengeTargetClbRaw
      ? Number.parseFloat(challengeTargetClbRaw)
      : NaN;
    const challengeWindowDays = challengeWindowDaysRaw
      ? Number.parseInt(challengeWindowDaysRaw, 10)
      : NaN;
    const challengeRefundPercent = challengeRefundPercentRaw
      ? Number.parseInt(challengeRefundPercentRaw, 10)
      : NaN;
    const hasChallengePayload =
      challengeMode === "refund_goal" &&
      challengeOfferSourceRaw === FINAL_OFFER_CHALLENGE_SOURCE &&
      Number.isFinite(challengeTargetClb) &&
      Number.isFinite(challengeWindowDays) &&
      Number.isFinite(challengeRefundPercent) &&
      isValidFinalOfferChallengeCombo(challengeWindowDays, challengeRefundPercent);
    const challengeDeadlineIso = hasChallengePayload
      ? new Date(Date.now() + challengeWindowDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const challengeTierKey = hasChallengePayload
      ? tierKeyFromCombo(challengeWindowDays, challengeRefundPercent)
      : null;

    if (hasChallengePayload) {
      /* Refund challenge is manual after score proof by email — full list price at checkout. */
      promotionCode = null;
      referralDiscountApplied = false;
      partnerDiscountApplied = false;
      campaignPromoKey = null;

      await db.collection("users").updateOne(
        matchUsersCollectionByWebUserIds(user.id),
        {
          $set: {
            challenge: {
              mode: "refund_goal",
              targetClb: challengeTargetClb,
              windowDays: challengeWindowDays,
              refundPercent: challengeRefundPercent,
              offerSource: FINAL_OFFER_CHALLENGE_SOURCE,
              tierKey: challengeTierKey,
              startsAt: new Date(),
              deadlineAt: challengeDeadlineIso ? new Date(challengeDeadlineIso) : null,
              status: "active",
              updatedAt: new Date(),
            },
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
            ...(isLikelySupabaseAuthUserId(user.id)
              ? supabaseAuthUserIdFieldsOnUserDoc(user.id)
              : { clerkUserId: user.id }),
          },
        },
        { upsert: true }
      );
    }
    const finalOfferSource = readRequestAttribution("final_offer");
    const isOnboardingFinalOffer =
      finalOfferSource === "onboarding_final_chance" && !hasChallengePayload;
    const finalOfferMetadata = isOnboardingFinalOffer ? finalOfferSource : null;
    const lastTouchCampaign =
      typeof lastTouch.campaign === "string" && lastTouch.campaign !== "(not set)"
        ? lastTouch.campaign
        : null;
    const metadataUtmCampaign =
      typeof userMetadata?.utm_campaign === "string" && userMetadata.utm_campaign !== "(not set)"
        ? userMetadata.utm_campaign
        : null;
    const clerkGoogleAdsId =
      typeof userMetadata?.google_ads_campaign_id === "string" &&
      userMetadata.google_ads_campaign_id.trim()
        ? userMetadata.google_ads_campaign_id.trim()
        : null;
    const googleAdsCampaignIdFromRequest =
      readRequestAttribution("google_ads_campaign_id") ||
      readRequestAttribution("gad_campaignid") ||
      acqCk.google_ads_campaign_id ||
      (typeof lastTouch.googleAdsCampaignId === "string" &&
      lastTouch.googleAdsCampaignId.trim()
        ? lastTouch.googleAdsCampaignId.trim()
        : null) ||
      clerkGoogleAdsId ||
      null;
    const attributionMetadata = {
      utm_source:
        readRequestAttribution("utm_source") ||
        acqCk.utm_source ||
        lastTouch.source ||
        userMetadata?.utm_source ||
        null,
      utm_medium:
        readRequestAttribution("utm_medium") ||
        acqCk.utm_medium ||
        lastTouch.medium ||
        userMetadata?.utm_medium ||
        null,
      utm_campaign:
        readRequestAttribution("utm_campaign") ||
        acqCk.utm_campaign ||
        metadataUtmCampaign ||
        googleAdsCampaignIdFromRequest ||
        lastTouchCampaign ||
        null,
      google_ads_campaign_id: googleAdsCampaignIdFromRequest,
      utm_content:
        readRequestAttribution("utm_content") ||
        acqCk.utm_content ||
        userMetadata?.utm_content ||
        null,
      utm_term:
        readRequestAttribution("utm_term") ||
        acqCk.utm_term ||
        userMetadata?.utm_term ||
        null,
      gclid:
        readRequestAttribution("gclid") ||
        acqCk.gclid ||
        lastTouch.gclid ||
        userMetadata?.gclid ||
        null,
      gbraid:
        readRequestAttribution("gbraid") ||
        acqCk.gbraid ||
        lastTouch.gbraid ||
        userMetadata?.gbraid ||
        null,
      wbraid:
        readRequestAttribution("wbraid") ||
        acqCk.wbraid ||
        lastTouch.wbraid ||
        userMetadata?.wbraid ||
        null,
      fbclid:
        readRequestAttribution("fbclid") ||
        acqCk.fbclid ||
        lastTouch.fbclid ||
        userMetadata?.fbclid ||
        null,
      msclkid:
        readRequestAttribution("msclkid") ||
        acqCk.msclkid ||
        lastTouch.msclkid ||
        userMetadata?.msclkid ||
        null,
      ttclid:
        readRequestAttribution("ttclid") ||
        acqCk.ttclid ||
        lastTouch.ttclid ||
        userMetadata?.ttclid ||
        null,
    };
    const inferredPaidSource =
      attributionMetadata.gclid || attributionMetadata.gbraid || attributionMetadata.wbraid
        ? "google"
        : attributionMetadata.msclkid
          ? "bing"
          : attributionMetadata.fbclid
            ? "facebook"
            : attributionMetadata.ttclid
              ? "tiktok"
              : "(direct)";
    const inferredMedium =
      attributionMetadata.gclid ||
      attributionMetadata.gbraid ||
      attributionMetadata.wbraid ||
      attributionMetadata.msclkid ||
      attributionMetadata.fbclid ||
      attributionMetadata.ttclid
        ? "cpc"
        : attributionMetadata.utm_source
          ? "referral"
          : "(none)";
    const inferredCampaign =
      attributionMetadata.utm_campaign || googleAdsCampaignIdFromRequest || "(not set)";
    const inferredSkillType =
      purchasePage?.includes("/speaking") ? "Speaking"
      : purchasePage?.includes("/writing") ? "Writing"
      : purchasePage?.includes("/listening") ? "Listening"
      : purchasePage?.includes("/reading") ? "Reading"
      : "General";
    const attributionSnapshot = {
      attribution_source:
        attributionMetadata.utm_source || inferredPaidSource,
      attribution_medium:
        attributionMetadata.utm_medium || inferredMedium,
      attribution_campaign:
        inferredCampaign,
      attribution_gclid:
        attributionMetadata.gclid,
      attribution_gbraid: attributionMetadata.gbraid,
      attribution_wbraid: attributionMetadata.wbraid,
      attribution_fbclid: attributionMetadata.fbclid,
      attribution_msclkid: attributionMetadata.msclkid,
      attribution_ttclid: attributionMetadata.ttclid,
      entry_page:
        readRequestAttribution("entry_page") ||
        acqCk.entry_page ||
        firstTouch.entryPage ||
        userMetadata?.entryPage ||
        null,
      referrer:
        readRequestAttribution("referrer") ||
        firstTouch.referrer ||
        userMetadata?.referrer ||
        null,
      attribution_session_id:
        readRequestAttribution("attribution_session_id") || null,
      purchase_page: purchasePage,
      skill_type: inferredSkillType,
      purchase_type: purchaseType || "first_purchase",
      attribution_country: country,
      attribution_currency: priceObject.currency?.toUpperCase() || null,
      time_to_purchase_minutes: timeToPurchaseMinutes,
      coupon_id: userMetadata?.couponId || null,
      promotion_code_id: promotionCode || null,
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
        await db.collection("pricing_ab_events").insertOne({
          eventType: "checkout_started",
          layout: pricingAbLayout,
          userId: user.id,
          priceId,
          planName: productDetails.name,
          createdAt: new Date(),
        });
      } catch (abErr) {
        console.error("pricing_ab checkout_started log failed:", abErr);
      }
    }

    const homeAbRaw = readRequestAttribution("home_ab_variant");
    const homeAbVariant = isHomeAbVariant(homeAbRaw ?? undefined) ? homeAbRaw : null;
    const homeAbMeta: Record<string, string> =
      homeAbVariant !== null ? { home_ab_variant: homeAbVariant } : {};

    if (homeAbVariant && isHomeAbExperimentVariant(homeAbVariant)) {
      try {
        await db.collection("home_ab_events").insertOne({
          eventType: "checkout_started",
          variant: homeAbVariant,
          userId: user.id,
          priceId,
          planName: productDetails.name,
          createdAt: new Date(),
        });
      } catch (abErr) {
        console.error("home_ab checkout_started log failed:", abErr);
      }
    }

    const ga4ClientId = readRequestAttribution("ga4_client_id");
    const ga4SessionId = readRequestAttribution("ga4_session_id");
    const ga4CheckoutMeta: Record<string, string> = {
      ...(ga4ClientId ? { ga4_client_id: ga4ClientId } : {}),
      ...(ga4SessionId ? { ga4_session_id: ga4SessionId } : {}),
    };

    logger.info("Creating checkout session", {
      component: "checkout_session_api",
      action: "create_checkout_session",
      userId: user.id,
      email,
      metadata: {
        product,
        priceId,
        hasPromotionCode: !!promotionCode,
        referralDiscountApplied,
        partnerDiscountApplied,
        campaignPromoKey,
        isOnboardingFinalOffer,
      },
    });

    let checkoutDiscounts: Array<{ promotion_code?: string; coupon?: string }> = [];
    if (promotionCode) {
      checkoutDiscounts = [{ promotion_code: promotionCode }];
    } else if (isOnboardingFinalOffer && mode === "subscription") {
      const couponId = await resolveFinalOfferCouponId();
      checkoutDiscounts = [{ coupon: couponId }];
    }

    const session: any = await stripe.checkout.sessions.create({
      ...stripeCheckoutPaymentMethodParams(),
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: buildCheckoutCancelUrl(origin, purchasePage, {
        priceId,
      }),

      automatic_tax: { enabled: true },
      ...(checkoutDiscounts.length === 0
        ? { allow_promotion_codes: !hasChallengePayload }
        : {}),
      ...(checkoutDiscounts.length > 0 ? { discounts: checkoutDiscounts } : {}),
      metadata: recordToStripeMetadata({
        user_id: user.id,
        plan_name: productDetails.name,
        referral_code: userMetadata?.referralCode || null,
        final_offer_source: finalOfferMetadata,
        challenge_mode: hasChallengePayload ? "refund_goal" : null,
        challenge_target_clb: hasChallengePayload ? String(challengeTargetClb) : null,
        challenge_window_days: hasChallengePayload ? String(challengeWindowDays) : null,
        challenge_refund_percent: hasChallengePayload ? String(challengeRefundPercent) : null,
        challenge_offer_source: hasChallengePayload ? FINAL_OFFER_CHALLENGE_SOURCE : null,
        challenge_tier_key: challengeTierKey ?? "",
        challenge_deadline_at: challengeDeadlineIso,
        ...attributionMetadata,
        ...attributionSnapshot,
        ...pricingAbMeta,
        ...homeAbMeta,
        ...(referralDiscountApplied && {
          referral_discount_applied:
            userMetadata?.referralDiscount || "referral",
        }),
        ...(partnerDiscountApplied && {
          partner_ref_discount_applied: "partner_referee",
          partner_referral_code:
            typeof userMetadata?.partnerReferralCode === "string"
              ? userMetadata.partnerReferralCode
              : "",
        }),
        ...(campaignPromoKey && { campaign_promo: campaignPromoKey }),
        ...ga4CheckoutMeta,
      }),
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: recordToStripeMetadata({
            user_id: user.id,
            plan_name: productDetails.name,
            referral_code: userMetadata?.referralCode || null,
            final_offer_source: finalOfferMetadata,
            challenge_mode: hasChallengePayload ? "refund_goal" : null,
            challenge_target_clb: hasChallengePayload ? String(challengeTargetClb) : null,
            challenge_window_days: hasChallengePayload ? String(challengeWindowDays) : null,
            challenge_refund_percent: hasChallengePayload ? String(challengeRefundPercent) : null,
            challenge_offer_source: hasChallengePayload ? FINAL_OFFER_CHALLENGE_SOURCE : null,
            challenge_tier_key: challengeTierKey ?? "",
            challenge_deadline_at: challengeDeadlineIso,
            ...ga4CheckoutMeta,
            ...attributionMetadata,
            ...attributionSnapshot,
            ...pricingAbMeta,
            ...homeAbMeta,
            ...(referralDiscountApplied && {
              referral_discount_applied:
                userMetadata?.referralDiscount || "referral",
            }),
            ...(partnerDiscountApplied && {
              partner_ref_discount_applied: "partner_referee",
              partner_referral_code:
                typeof userMetadata?.partnerReferralCode === "string"
                  ? userMetadata.partnerReferralCode
                  : "",
            }),
            ...(campaignPromoKey && { campaign_promo: campaignPromoKey }),
          }),
        },
      }),
    });

    logger.info("Checkout session created successfully", {
      component: "checkout_session_api",
      action: "checkout_session_created",
      userId: user.id,
      email,
      metadata: {
        sessionId: session.id,
        hasReferralCode: !!userMetadata?.referralCode,
      },
    });

    trackAPICall("POST", "/api/checkout_session", 200, {
      sessionId: session.id,
      hasDiscount: !!promotionCode,
    });

    if (mode === "subscription" && session?.subscription) {
      await stripe.subscriptions.update(session.subscription, {
        metadata: recordToStripeMetadata({
          user_id: user.id,
          checkout_id: session.id,
          referral_code: userMetadata?.referralCode || null,
          final_offer_source: finalOfferMetadata,
          challenge_mode: hasChallengePayload ? "refund_goal" : null,
          challenge_target_clb: hasChallengePayload ? String(challengeTargetClb) : null,
          challenge_window_days: hasChallengePayload ? String(challengeWindowDays) : null,
          challenge_refund_percent: hasChallengePayload ? String(challengeRefundPercent) : null,
          challenge_offer_source: hasChallengePayload ? FINAL_OFFER_CHALLENGE_SOURCE : null,
          challenge_tier_key: challengeTierKey ?? "",
          challenge_deadline_at: challengeDeadlineIso,
          ...attributionMetadata,
          ...attributionSnapshot,
          ...pricingAbMeta,
          ...homeAbMeta,
          ...(referralDiscountApplied && {
            referral_discount_applied:
              userMetadata?.referralDiscount || "referral",
          }),
          ...(campaignPromoKey && { campaign_promo: campaignPromoKey }),
        }),
      });
    }
    await authAdmin.users.updateUserMetadata(user.id, {
      publicMetadata: {
        planCancelled: false,
      },
    });
    return NextResponse.redirect(session.url!, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    captureException(err, {
      component: "checkout_session_api",
      action: "checkout_session_error",
    });

    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
