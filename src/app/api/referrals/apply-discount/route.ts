import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { clerkClient } from "@clerk/express";
import mongoClient from "@/lib/mongodb";
import { ReferralRepository } from "@/repositories/referral.repo";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const ApplyDiscountSchema = z.object({
  referralCode: z
    .string()
    .regex(/^REF-[A-Z0-9]{6}$/, "Invalid referral code format"),
  userId: z.string(),
  userEmail: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ApplyDiscountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { referralCode, userId, userEmail } = parsed.data;

    // Find the referrer
    const referralRepo = new ReferralRepository(mongoClient);
    const referrer = await referralRepo.findOneByCode(referralCode);

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    // Get referrer user info
    const referrerUser = await clerkClient.users.getUser(referrer.userId);
    const referrerEmail = referrerUser.emailAddresses[0]?.emailAddress;

    if (!referrerEmail) {
      return NextResponse.json(
        { error: "Referrer email not found" },
        { status: 400 }
      );
    }

    // Check if referrer is eligible (has made a purchase)
    const referrerMetadata = referrerUser.publicMetadata as any;
    if (!referrerMetadata?.referralActive) {
      return NextResponse.json(
        { error: "Referrer is not eligible for rewards" },
        { status: 400 }
      );
    }

    // Create a 10% discount coupon for the new user
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const visibleCode = `REF-${suffix}`;

    const coupon = await stripe.coupons.create({
      name: `Referral Discount - ${referralCode}`,
      percent_off: 10,
      duration: "once",
      metadata: {
        userId,
        visibleCode,
        referralCode,
        referrerId: referrer.userId,
        referrerEmail,
        inviteeEmail: userEmail,
      },
      redeem_by: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    });

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: visibleCode,
      max_redemptions: 1,
      metadata: {
        userId,
        referralCode,
        referrerId: referrer.userId,
      },
    });

    // Store referral relationship in user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        referredBy: referrer.userId,
        referralCode,
        referralDiscount: visibleCode,
        referralCouponId: coupon.id,
        referralPromotionId: promotionCode.id,
        referralDiscountExpiry: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });

    // Send email to referrer about successful referral
    await sendReferralSuccessEmail({
      referrerEmail,
      inviteeEmail: userEmail,
      referralCode,
    });

    return NextResponse.json({
      success: true,
      message: "Referral discount applied successfully",
      data: {
        discountCode: visibleCode,
        discountPercent: 10,
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Apply discount error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendReferralSuccessEmail({
  referrerEmail,
  inviteeEmail,
  referralCode,
}: {
  referrerEmail: string;
  inviteeEmail: string;
  referralCode: string;
}) {
  try {
    // This would use your existing email infrastructure
    // For now, just log the success
    console.log(
      `Referral success: ${referrerEmail} referred ${inviteeEmail} with code ${referralCode}`
    );
  } catch (error) {
    console.error("Failed to send referral success email:", error);
  }
}
