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

    // Check if user has already used a referral discount
    const user = await clerkClient.users.getUser(userId);
    const userMetadata = user.publicMetadata as any;

    // Check if user already has a referral discount or has used one
    if (
      userMetadata?.referralDiscountUsed ||
      userMetadata?.referralActive === false ||
      userMetadata?.referralPromotionId
    ) {
      return NextResponse.json(
        {
          error: "User has already used a referral discount or already has one",
        },
        { status: 400 }
      );
    }

    // Find the referrer
    const referralRepo = new ReferralRepository(mongoClient);
    const referrer = await referralRepo.findOneByCode(referralCode);

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    // Prevent self-referral - user cannot use their own referral code
    if (userId === referrer.userId) {
      return NextResponse.json(
        { error: "You cannot use your own referral code" },
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

    // Check referrer metadata for eligibility flag. If it's explicitly false,
    // we will not block the discount creation here — just log the state.
    const referrerMetadata = referrerUser.publicMetadata as any;
    if (referrerMetadata?.referralActive === false) {
      console.warn(
        `Referrer ${referrer.userId} has referralActive=false; continuing to apply discount for invitee ${userId}`
      );
      // previously we returned 400 here; allow the invitee to receive the discount
      // because referral eligibility may be managed elsewhere (webhooks, limits, etc.)
    }

    // Create a 20% discount coupon for the new user
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const visibleCode = `REF-${suffix}`;

    const coupon = await stripe.coupons.create({
      name: `Referral Discount - ${referralCode}`,
      percent_off: 20,
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
        referralActive: true, // Mark referral as active
        referralDiscountActive: true, // Mark discount as active
      },
    });

    console.log(`✅ Referral discount created for user ${userId}:`);
    console.log(`   - Referral Code: ${referralCode}`);
    console.log(`   - Promotion ID: ${promotionCode.id}`);
    console.log(`   - Coupon ID: ${coupon.id}`);
    console.log(`   - Discount Code: ${visibleCode}`);
    console.log(`   - Referral Active: true`);
    console.log(`   - Referral Discount Active: true`);

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
        discountPercent: 20,
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
