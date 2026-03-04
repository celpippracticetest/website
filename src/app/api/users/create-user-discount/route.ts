import { NextResponse } from "next/server";
import Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userMetadata = user.publicMetadata as any;

    // First, check if user already has a valid coupon - return it if so
    const couponId = userMetadata?.couponId;
    const couponCode = userMetadata?.couponCode;
    if (couponId && couponCode) {
      return NextResponse.json({
        couponId,
        couponCode,
      });
    }

    // Check if user has used a discount or has referral discounts (should not get new user discount)
    if (
      userMetadata?.referralPromotionId ||
      userMetadata?.referralCode ||
      userMetadata?.referralDiscountUsed ||
      userMetadata?.newDiscountUsed
    ) {
      return NextResponse.json(
        {
          error: "User already has a discount or has used one",
        },
        { status: 400 }
      );
    }

    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const visibleCode = `NEW-${suffix}`;

    const coupon = await stripe.coupons.create({
      name: visibleCode,
      percent_off: 10,
      duration: "once",
      metadata: { userId, visibleCode },
      redeem_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    });

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: visibleCode,
    });

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        couponId: coupon.id,
        couponCode: visibleCode,
        promotionCodeId: promotionCode.id,
      },
    });

    return NextResponse.json({ couponId: coupon.id, couponCode: visibleCode });
  } catch (error) {
    console.error("create-user-discount error:", error);
    return NextResponse.json(
      {
        error: "Failed to create coupon",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
