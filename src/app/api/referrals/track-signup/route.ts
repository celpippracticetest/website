import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { ReferralRepository } from "@/repositories/referral.repo";
import { ReferralInvitationRepository } from "@/repositories/referral-invitation.repo";

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

    const referralRepo = new ReferralRepository(mongoClient);
    await referralRepo.ensureIndexes();

    const referrer = await referralRepo.findOneByCode(referralCode);

    const clerk = await clerkClient();

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    // Prevent self-referral
    if (userId === referrer.userId) {
      return NextResponse.json(
        { error: "Self-referral is not allowed" },
        { status: 400 }
      );
    }

    const invitationRepo = new ReferralInvitationRepository(mongoClient);
    await invitationRepo.ensureIndexes();

    const existingInvitation =
      await invitationRepo.findInvitationByCodeAndInvitee(referralCode, userId);

    if (existingInvitation) {
      return NextResponse.json(
        {
          success: false,
          message: "User already tracked with this referral code",
          referrerId: referrer.userId,
        },
        { status: 400 }
      );
    }

    const invitation = await invitationRepo.createInvitation({
      inviterId: referrer.userId,
      inviteeId: userId,
      referralCode: referralCode,
      status: "pending",
      invitedAt: new Date(),
    });

    console.log(`✅ Created referral invitation: ${invitation._id}`);

    const referrerUser = await clerk.users.getUser(referrer.userId);
    const currentMetadata = referrerUser.publicMetadata || {};
    const currentTotalInvitees = (currentMetadata as any)?.totalInvitees || 0;
    const newTotalInvitees = currentTotalInvitees + 1;

    await clerk.users.updateUserMetadata(referrer.userId, {
      publicMetadata: {
        ...currentMetadata,
        totalInvitees: newTotalInvitees,
        lastInviteeDate: new Date().toISOString(),
      },
    });

    console.log(`✅ Tracked new signup for referrer ${referrer.userId}:`, {
      totalInvitees: newTotalInvitees,
      message: "Reward level will be calculated after successful purchase",
    });

    return NextResponse.json({
      success: true,
      message: "Signup tracked successfully",
      referrerId: referrer.userId,
      totalInvitees: newTotalInvitees,
    });
  } catch (error: any) {
    console.error("Track signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
