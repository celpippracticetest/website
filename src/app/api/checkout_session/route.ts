import { clerkClient } from "@clerk/express";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const product: string | null = req.nextUrl.searchParams.get("product");
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

    console.log("🔍 Checking referral discount for user:", user.id);
    console.log("🔍 User metadata:", JSON.stringify(userMetadata, null, 2));

    // First check for referral discount (referralPromotionId)
    const referralPromotionId = userMetadata?.referralPromotionId;
    const newUserPromotionId = userMetadata?.promotionCodeId;

    // Prioritize referral discount over NEW discount
    // Only apply referral discount if user actually signed up with a referral code
    if (
      referralPromotionId &&
      userMetadata?.referralCode && // User must have a referral code
      userMetadata?.referralActive === true &&
      userMetadata?.referralDiscountActive !== false &&
      !userMetadata?.referralDiscountUsed &&
      !userMetadata?.hasEverPurchased // User must not have made any purchase before
    ) {
      let isExpired = false;
      if (userMetadata?.referralDiscountExpiry) {
        const expiryDate = new Date(userMetadata.referralDiscountExpiry);
        if (expiryDate <= new Date()) {
          isExpired = true;
        }
      }
      if (!isExpired) {
        promotionCode = referralPromotionId;
        referralDiscountApplied = true;
        console.log(
          `✅ Applying referral promotion_code id: ${referralPromotionId} for user with referral code: ${userMetadata.referralCode}`
        );
      } else {
        console.log("❌ Referral discount has expired");
      }
    } else if (userMetadata?.referralDiscountUsed) {
      console.log("❌ Referral discount already used by this user");
    } else if (userMetadata?.referralDiscountActive === false) {
      console.log("❌ Referral discount is not active for this user");
    } else if (userMetadata?.referralActive === false) {
      console.log("❌ Referral code is not active (already used)");
    } else if (!userMetadata?.referralCode) {
      console.log(
        "❌ User does not have a referral code - not eligible for referral discount"
      );
    } else {
      console.log("❌ No usable referral promotion code found in metadata");
    }

    // Only apply NEW discount if no referral discount is available and user hasn't purchased before
    if (
      !promotionCode &&
      newUserPromotionId &&
      !userMetadata?.hasEverPurchased
    ) {
      promotionCode = newUserPromotionId;
      console.log(
        `✅ Applying NEW user promotion_code id: ${newUserPromotionId}`
      );
    } else if (userMetadata?.hasEverPurchased) {
      console.log(
        "❌ User has already made a purchase - no discount available"
      );
    }

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

    console.log(
      "🔍 Creating checkout session with promotion code:",
      promotionCode
    );
    console.log("🔍 Referral discount applied:", referralDiscountApplied);

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
        referral_code: userMetadata?.referralCode || null,
        ...(referralDiscountApplied && {
          referral_discount_applied:
            userMetadata?.referralDiscount || "referral",
        }),
      },
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: {
            user_id: user.id,
            referral_code: userMetadata?.referralCode || null,
            ...(referralDiscountApplied && {
              referral_discount_applied:
                userMetadata?.referralDiscount || "referral",
            }),
          },
        },
      }),
    });

    console.log("✅ Checkout session created successfully");
    console.log("✅ Session ID:", session.id);
    console.log("✅ Session URL:", session.url);
    console.log(
      "🔍 Final session metadata:",
      JSON.stringify(session.metadata, null, 2)
    );
    console.log("🔍 User ID being used:", user.id);
    console.log("🔍 Referral code:", userMetadata?.referralCode);

    if (mode === "subscription" && session?.subscription) {
      await stripe.subscriptions.update(session.subscription, {
        metadata: {
          user_id: user.id,
          checkout_id: session.id,
          referral_code: userMetadata?.referralCode || null,
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
    return NextResponse.json(
      { error: err.message },
      { status: err.statusCode || 500 }
    );
  }
}
