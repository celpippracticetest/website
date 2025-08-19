import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";
import mongoClient from "@/lib/mongodb";
import { ReferralRepository } from "@/repositories/referral.repo";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { referralCode } = await req.json();

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    // Find the referrer
    const referralRepo = new ReferralRepository(mongoClient);
    await referralRepo.ensureIndexes();

    const referrer = await referralRepo.findOneByCode(referralCode);

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    // Update referrer's metadata to increment total invitees
    const referrerUser = await clerkClient.users.getUser(referrer.userId);
    const currentMetadata = referrerUser.publicMetadata || {};

    // Calculate total invitees from DB (distinct invitees)
    const newTotalInvitees = await referralRepo.getInviteeCount(
      referrer.userId
    );

    // Calculate new reward level
    let rewardLevel = 1;
    if (newTotalInvitees >= 10) rewardLevel = 3;
    else if (newTotalInvitees >= 5) rewardLevel = 2;

    await clerkClient.users.updateUserMetadata(referrer.userId, {
      publicMetadata: {
        ...currentMetadata,
        totalInvitees: newTotalInvitees,
        rewardLevel: rewardLevel,
        lastInviteeDate: new Date().toISOString(),
      },
    });

    console.log(`✅ Tracked new signup for referrer ${referrer.userId}:`, {
      totalInvitees: newTotalInvitees,
      rewardLevel: rewardLevel,
    });

    return NextResponse.json({
      success: true,
      message: "Signup tracked successfully",
      referrerId: referrer.userId,
      totalInvitees: newTotalInvitees,
      rewardLevel: rewardLevel,
    });
  } catch (error: any) {
    console.error("Track signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
