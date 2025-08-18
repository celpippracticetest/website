import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal-request.repo";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize repositories
    const rewardRepo = new ReferralRewardRepository(mongoClient);
    const withdrawalRepo = new WithdrawalRequestRepository(mongoClient);

    await rewardRepo.ensureIndexes();
    await withdrawalRepo.ensureIndexes();

    // Get referral statistics
    const [
      totalInvitees,
      totalConfirmedRewards,
      totalPendingRewards,
      totalWithdrawn,
      pendingWithdrawals,
      recentRewards,
      recentWithdrawals,
      rewardLevel,
    ] = await Promise.all([
      rewardRepo.getInviteeCount(userId),
      rewardRepo.getTotalEarnings(userId),
      rewardRepo.getTotalPendingRewards(userId),
      withdrawalRepo.getTotalWithdrawnAmount(userId),
      withdrawalRepo.getPendingWithdrawalAmount(userId),
      rewardRepo.findRewardsByInviterId(userId),
      withdrawalRepo.findWithdrawalRequestsByUserId(userId),
      rewardRepo.getRewardLevel(userId),
    ]);

    // Calculate available balance
    const availableBalance =
      totalConfirmedRewards - totalWithdrawn - pendingWithdrawals;

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
