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

    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    // Get user information
    const user = await clerk.users.getUser(userId);
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
    const referrerUser = await clerk.users.getUser(referrer.userId);
    const referrerEmail = referrerUser.emailAddresses[0]?.emailAddress;

    if (!referrerEmail) {
      return NextResponse.json(
        { error: "Referrer email not found" },
        { status: 400 }
      );
    }

    // Do not block on referrer referralActive: invitee discounts are applied via
    // apply-discount even when that flag is missing or false; reward eligibility is enforced elsewhere.

    // Store referral relationship in user metadata
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        referredBy: referrer.userId,
        referralCode: referralCode,
        referralApplied: true,
        referralAppliedAt: new Date().toISOString(),
        referralActive: true, // Mark referral as active
      },
    });

    const invitationRepo = new ReferralInvitationRepository(mongoClient);
    await invitationRepo.ensureIndexes();

    // Check if invitation already exists
    const existingInvitation =
      await invitationRepo.findInvitationByCodeAndInvitee(referralCode, userId);

    let invitation;
    if (existingInvitation) {
      invitation = existingInvitation;
    } else {
      invitation = await invitationRepo.createInvitation({
        inviterId: referrer.userId,
        inviteeId: userId,
        referralCode: referralCode,
        status: "pending",
        invitedAt: new Date(),
      });
    }

    // Update referrer's metadata
    const currentMetadata = referrerUser.publicMetadata || {};

    const totalInvitees = await invitationRepo.getTotalInvitations(
      referrer.userId
    );
    const newTotalInvitees = totalInvitees + 1;

    let rewardLevel = 1;
    if (newTotalInvitees >= 10) rewardLevel = 3;
    else if (newTotalInvitees >= 5) rewardLevel = 2;

    await clerk.users.updateUserMetadata(referrer.userId, {
      publicMetadata: {
        ...currentMetadata,
        hasSuccessfulReferral: true,
        lastReferralDate: new Date().toISOString(),
        totalInvitations: newTotalInvitees,
        totalInvitees: newTotalInvitees,
        rewardLevel: rewardLevel,
        lastInviteeId: userId,
        lastInviteeEmail: userEmail,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Referral relationship established successfully",
      data: {
        referrerId: referrer.userId,
        referrerEmail: referrerEmail,
        referralCode: referralCode,
        invitationId: invitation._id,
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
