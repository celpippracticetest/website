import { NextResponse } from "next/server";
import Stripe from "stripe";
import { clerkClient } from "@clerk/express";
import { ensureUserReferral } from "@/app/api/referrals/route";

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

    const baseUrl = (() => {
      const u = new URL(req.url);
      return `${u.protocol}//${u.host}`;
    })();

    const user = await clerkClient.users.getUser(userId);

    if (
      !(
        user?.publicMetadata?.referralCode && user?.publicMetadata?.referralLink
      )
    ) {
      try {
        await ensureUserReferral(userId, baseUrl);
      } catch (e) {
        console.error("ensureUserReferral error:", e);
      }
    }

    const freshUser = await clerkClient.users.getUser(userId);

    // If referralActive is explicitly false, the user should not receive a discount
    // (e.g. referral already used). If it's true (pending referral) or undefined,
    // allow coupon creation.
    if (freshUser?.publicMetadata?.referralActive === false) {
      return NextResponse.json(
        { error: "User referral is inactive and cannot receive a discount." },
        { status: 400 }
      );
    }

    const couponId = freshUser?.publicMetadata.couponId;
    const couponCode = freshUser?.publicMetadata.couponCode;
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
        ...freshUser.publicMetadata,
        couponId: coupon.id,
        couponCode: visibleCode,
        promotionCodeId: promotionCode.id,
      },
    });

    const referralCode = freshUser?.publicMetadata?.referralCode as
      | string
      | undefined;
    const referralLink = freshUser?.publicMetadata?.referralLink as
      | string
      | undefined;

    return NextResponse.json({
      couponId: coupon.id,
      couponCode: visibleCode,
      referralCode,
      referralLink,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
