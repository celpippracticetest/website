import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { ReferralRepository } from "@/repositories/referral.repo";
import { clerkClient } from "@clerk/express";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    // Get user information
    const user = await clerkClient.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Check if user already has a referral code
    if ((user.publicMetadata as any)?.referredBy) {
      return NextResponse.json(
        { error: "User already has a referral relationship" },
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

    // Store referral relationship in user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        referredBy: referrer.userId,
        referralCode: referralCode,
        referralApplied: true,
        referralAppliedAt: new Date().toISOString(),
      },
    });

    // Update referrer's metadata to show they have a successful referral
    const currentMetadata = referrerUser.publicMetadata || {};
    const currentTotalInvitees = (currentMetadata as any)?.totalInvitees || 0;
    const newTotalInvitees = currentTotalInvitees + 1;

    await clerkClient.users.updateUserMetadata(referrer.userId, {
      publicMetadata: {
        ...currentMetadata,
        hasSuccessfulReferral: true,
        lastReferralDate: new Date().toISOString(),
        totalInvitees: newTotalInvitees,
        lastInviteeId: userId,
        lastInviteeEmail: userEmail,
      },
    });

    console.log(`✅ Updated referrer metadata - Total invitees: ${newTotalInvitees}`);

    return NextResponse.json({
      success: true,
      message: "Referral relationship established successfully",
      data: {
        referrerId: referrer.userId,
        referrerEmail: referrerEmail,
        referralCode: referralCode,
      },
    });
  } catch (error: any) {
    console.error("Process signup referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
