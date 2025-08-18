import { NextResponse } from "next/server";
import Stripe from "stripe";
import { clerkClient } from "@clerk/express";

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

    const user = await clerkClient.users.getUser(userId);

    if (user?.publicMetadata?.referralActive) {
      return NextResponse.json(
        {
          error:
            "User already has an active referral and cannot receive a discount.",
        },
        { status: 400 }
      );
    }

    const couponId = user?.publicMetadata.couponId;
    const couponCode = user?.publicMetadata.couponCode;
    if (couponId && couponCode) {
      return NextResponse.json({
        couponId,
        couponCode,
      });
    }

    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const visibleCode = `NEW-${suffix}`;

      const coupon = await stripe.coupons.create({
        name: visibleCode,
        percent_off: 20,
        duration: "once",
        metadata: { userId, visibleCode },
        redeem_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      });

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: visibleCode,
    });

    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        couponId: coupon.id,
        couponCode: visibleCode,
        promotionCodeId: promotionCode.id,
      },
    });

    return NextResponse.json({ couponId: coupon.id, couponCode: visibleCode });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
