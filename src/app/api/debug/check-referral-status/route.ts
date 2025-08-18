import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user metadata from Clerk
    const user = await clerkClient.users.getUser(userId);
    
    // Check if user has referral code
    const referralCode = (user.publicMetadata as any)?.referralCode;
    
    if (!referralCode) {
      return NextResponse.json({
        success: true,
        message: "User has no referral code",
        data: {
          hasReferralCode: false,
          metadata: user.publicMetadata,
        }
      });
    }

    // Get referral status
    const referralStatus = {
      hasReferralCode: true,
      referralCode: referralCode,
      referralActive: (user.publicMetadata as any)?.referralActive,
      referralDiscountUsed: (user.publicMetadata as any)?.referralDiscountUsed,
      referralDiscountActive: (user.publicMetadata as any)?.referralDiscountActive,
      referralPromotionId: (user.publicMetadata as any)?.referralPromotionId,
      promotionCodeId: (user.publicMetadata as any)?.promotionCodeId,
      referralDiscount: (user.publicMetadata as any)?.referralDiscount,
      referralDiscountExpiry: (user.publicMetadata as any)?.referralDiscountExpiry,
      referralApplied: (user.publicMetadata as any)?.referralApplied,
      referralAppliedAt: (user.publicMetadata as any)?.referralAppliedAt,
      hasPendingRewards: (user.publicMetadata as any)?.hasPendingRewards,
      lastReferralDate: (user.publicMetadata as any)?.lastReferralDate,
    };

    return NextResponse.json({
      success: true,
      message: "Referral status retrieved successfully",
      data: {
        ...referralStatus,
        fullMetadata: user.publicMetadata,
        userId: userId,
        email: user.emailAddresses[0]?.emailAddress,
      }
    });
  } catch (error: any) {
    console.error("Check referral status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
