import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { ReferralInvitationRepository } from "@/repositories/referral-invitation.repo";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal-request.repo";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user metadata from Clerk
    const { clerkClient } = await import("@clerk/express");
    const user = await clerkClient.users.getUser(userId);
    const userMetadata = user.publicMetadata as any;

    // Initialize repositories
    const rewardRepo = new ReferralRewardRepository(mongoClient);
    const invitationRepo = new ReferralInvitationRepository(mongoClient);
    const withdrawalRepo = new WithdrawalRequestRepository(mongoClient);

    await rewardRepo.ensureIndexes();
    await invitationRepo.ensureIndexes();
    await withdrawalRepo.ensureIndexes();

    // Get referral statistics from database and metadata
    const [
      totalInvitees, // From database (all invitations)
      totalConfirmedRewards, // From database (confirmed rewards)
      totalPendingRewards, // From database
      totalWithdrawn, // From database
      pendingWithdrawals, // From database
      recentRewards, // From database
      recentWithdrawals, // From database
      rewardLevel, // From metadata
    ] = await Promise.all([
      invitationRepo.getTotalInvitations(userId), // Count all invitations (pending + completed)
      rewardRepo.getTotalConfirmedRewards(userId), // Calculate from database
      rewardRepo.getTotalPendingRewards(userId),
      withdrawalRepo.getTotalWithdrawnAmount(userId),
      withdrawalRepo.getPendingWithdrawalAmount(userId),
      rewardRepo.findRewardsByInviterId(userId),
      withdrawalRepo.findWithdrawalRequestsByUserId(userId),
      Promise.resolve(userMetadata?.rewardLevel || 1), // Read from metadata
    ]);

    // Calculate available balance
    const availableBalance = totalConfirmedRewards - totalWithdrawn - pendingWithdrawals;

    return NextResponse.json({
      success: true,
      data: {
        totalInvitees,
        totalConfirmedRewards: parseFloat(totalConfirmedRewards.toFixed(2)),
        totalPendingRewards: parseFloat(totalPendingRewards.toFixed(2)),
        totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
        pendingWithdrawals: parseFloat(pendingWithdrawals.toFixed(2)),
        availableBalance: parseFloat(availableBalance.toFixed(2)),
        rewardLevel,
        canWithdraw: availableBalance >= 5,
        minimumWithdrawal: 5,
        recentRewards: recentRewards.slice(0, 5),
        recentWithdrawals: recentWithdrawals.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error("Referral stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
