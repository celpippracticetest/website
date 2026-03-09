import { clerkClient } from "@clerk/express";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { logger, captureException, trackAPICall } from "@/lib/sentry-logger";
import { getDb } from "@/lib/mongodb";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(req: NextRequest) {
  try {
    const product: string | null = req.nextUrl.searchParams.get("product");
    const formData = await req.formData();
    const headersList = await headers();
    const origin = headersList.get("origin");
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!product) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if user has referral discount (prioritize referral over NEW discount)
    const userMetadata = user.publicMetadata as any;
    let promotionCode: string | null = null;
    let referralDiscountApplied = false;

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
          const updatedUser = await clerkClient.users.getUser(user.id);
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

    // Create Checkout Sessions from body params.
    // Retrieve the product details using the product ID
    const productDetails = await stripe.products.retrieve(product);
    if (!productDetails.default_price) {
      return NextResponse.json(
        { error: "Product does not have a default price" },
        { status: 400 }
      );
    }

    const priceId = productDetails.default_price as string;
    const priceObject = await stripe.prices.retrieve(priceId);
    const mode = priceObject.recurring ? "subscription" : "payment";
    const db = await getDb();
    const userDoc = await db.collection("users").findOne({ clerkUserId: user.id });
    const firstTouchTimestamp =
      userDoc?.attribution?.firstTouch?.timestamp ||
      userDoc?.publicMetadata?.acquisitionDate ||
      null;
    const firstTouchDate = firstTouchTimestamp ? new Date(firstTouchTimestamp) : null;
    const timeToPurchaseMinutes =
      firstTouchDate && !Number.isNaN(firstTouchDate.getTime())
        ? Math.max(0, Math.round((Date.now() - firstTouchDate.getTime()) / 60000))
        : null;
    const referrer = headersList.get("referer");
    let purchasePage: string | null = null;
    if (referrer) {
      try {
        purchasePage = new URL(referrer).pathname;
      } catch {
        purchasePage = referrer;
      }
    }
    const country =
      headersList.get("x-vercel-ip-country") ||
      headersList.get("cf-ipcountry") ||
      userDoc?.attribution?.lastTouch?.country ||
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
    const attributionMetadata = {
      utm_source:
        readRequestAttribution("utm_source") ||
        userDoc?.attribution?.lastTouch?.source ||
        userMetadata?.utm_source ||
        null,
      utm_medium:
        readRequestAttribution("utm_medium") ||
        userDoc?.attribution?.lastTouch?.medium ||
        userMetadata?.utm_medium ||
        null,
      utm_campaign:
        readRequestAttribution("utm_campaign") ||
        userDoc?.attribution?.lastTouch?.campaign ||
        userMetadata?.utm_campaign ||
        null,
      utm_content:
        readRequestAttribution("utm_content") || userMetadata?.utm_content || null,
      utm_term:
        readRequestAttribution("utm_term") || userMetadata?.utm_term || null,
      gclid:
        readRequestAttribution("gclid") ||
        userDoc?.attribution?.lastTouch?.gclid ||
        userMetadata?.gclid ||
        null,
    };
    const attributionSnapshot = {
      attribution_source:
        attributionMetadata.utm_source ||
        (attributionMetadata.gclid ? "google_ads" : "direct"),
      attribution_medium:
        attributionMetadata.utm_medium,
      attribution_campaign:
        attributionMetadata.utm_campaign,
      attribution_gclid:
        attributionMetadata.gclid,
      entry_page:
        readRequestAttribution("entry_page") ||
        userDoc?.attribution?.firstTouch?.entryPage ||
        userMetadata?.entryPage ||
        null,
      referrer:
        readRequestAttribution("referrer") ||
        userDoc?.attribution?.firstTouch?.referrer ||
        userMetadata?.referrer ||
        null,
      attribution_session_id:
        readRequestAttribution("attribution_session_id") || null,
      purchase_page: purchasePage,
      attribution_country: country,
      attribution_currency: priceObject.currency?.toUpperCase() || null,
      time_to_purchase_minutes: timeToPurchaseMinutes,
      coupon_id: userMetadata?.couponId || null,
      promotion_code_id: promotionCode || null,
    };

    logger.info("Creating checkout session", {
      component: "checkout_session_api",
      action: "create_checkout_session",
      userId: user.id,
      email,
      metadata: {
        product,
        hasPromotionCode: !!promotionCode,
        referralDiscountApplied,
      },
    });

    const session: any = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/failed?canceled=true`,
      automatic_tax: { enabled: true },
      ...(promotionCode ? {} : { allow_promotion_codes: true }),
      // Correct way to pre-apply a promotion code on Checkout
      ...(promotionCode && { discounts: [{ promotion_code: promotionCode }] }),
      metadata: {
        user_id: user.id,
        plan_name: productDetails.name,
        referral_code: userMetadata?.referralCode || null,
        ...attributionMetadata,
        ...attributionSnapshot,
        ...(referralDiscountApplied && {
          referral_discount_applied:
            userMetadata?.referralDiscount || "referral",
        }),
      },
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_name: productDetails.name,
            referral_code: userMetadata?.referralCode || null,
            ...attributionMetadata,
            ...attributionSnapshot,
            ...(referralDiscountApplied && {
              referral_discount_applied:
                userMetadata?.referralDiscount || "referral",
            }),
          },
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

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "checkout_session_created",
      properties: {
        session_id: session.id,
        plan_name: productDetails.name,
        price_id: priceId,
        mode,
        has_discount: !!promotionCode,
        referral_discount_applied: referralDiscountApplied,
        currency: priceObject.currency?.toUpperCase() || "CAD",
        amount: (priceObject.unit_amount || 0) / 100,
        email,
      },
    });
    if (referralDiscountApplied) {
      posthog.capture({
        distinctId: user.id,
        event: "referral_discount_applied",
        properties: {
          session_id: session.id,
          referral_code: userMetadata?.referralCode || null,
          plan_name: productDetails.name,
          email,
        },
      });
    }
    await posthog.shutdown();

    if (mode === "subscription" && session?.subscription) {
      await stripe.subscriptions.update(session.subscription, {
        metadata: {
          user_id: user.id,
          checkout_id: session.id,
          referral_code: userMetadata?.referralCode || null,
          ...attributionMetadata,
          ...attributionSnapshot,
          ...(referralDiscountApplied && {
            referral_discount_applied:
              userMetadata?.referralDiscount || "referral",
          }),
        },
      });
    }
    await clerkClient.users.updateUserMetadata(user.id, {
      publicMetadata: {
        planCancelled: false,
      },
    });
    return NextResponse.redirect(session.url, 303);
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
