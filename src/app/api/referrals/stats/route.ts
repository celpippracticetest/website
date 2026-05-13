import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { ReferralInvitationRepository } from "@/repositories/referral-invitation.repo";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal-request.repo";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appUserAdmin } = await import("@/lib/auth/app-user-admin");
    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(userId);
    const userMetadata = user.publicMetadata as any;

    // Initialize repositories
    const rewardRepo = new ReferralRewardRepository(documentsClient);
    const invitationRepo = new ReferralInvitationRepository(documentsClient);
    const withdrawalRepo = new WithdrawalRequestRepository(documentsClient);

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
    const availableBalance =
      totalConfirmedRewards - totalWithdrawn - pendingWithdrawals;

    // Build Activity array (signup / purchase / withdrawal-request / withdrawal-paid)
    const mapRewardToActivity = (r: any) => {
      const rStatus = (r?.status || "").toLowerCase();
      const statusMap: Record<string, string> = {
        confirmed: "paid",
        paid: "paid",
        completed: "paid",
        pending: "pending",
        processing: "processing",
        failed: "failed",
        refunded: "refunded",
        rejected: "rejected",
      };
      return {
        id: r?._id?.toString?.() || r?.id,
        date: r?.createdAt || r?.date || new Date(),
        email: r?.inviteeEmail || r?.email || r?.invitee?.email,
        name: r?.inviteeName || r?.name,
        action: "purchase",
        amount:
          typeof r?.amount === "number"
            ? r.amount
            : typeof r?.rewardAmount === "number"
            ? r.rewardAmount
            : undefined,
        status: (statusMap[rStatus] as any) || rStatus || "paid",
        referralCode: r?.referralCode,
        meta: r || {},
      };
    };

    const mapWithdrawalToActivity = (w: any) => {
      const wStatus = (w?.status || "").toLowerCase();
      const description =
        w?.adminNotes ||
        w?.reason ||
        w?.description ||
        w?.meta?.reason ||
        w?.meta?.description ||
        "";
      // normalize statuses
      let status: string = "requested";
      let action: string = "withdrawal-request";
      if (wStatus === "paid" || wStatus === "completed") {
        status = "paid";
        action = "withdrawal-paid";
      } else if (
        wStatus === "processing" ||
        wStatus === "in-review" ||
        wStatus === "under-review"
      ) {
        status = "processing";
        action = "withdrawal-request";
      } else if (wStatus === "failed" || wStatus === "refunded") {
        status = wStatus;
        action = "withdrawal-request";
      } else if (wStatus === "rejected") {
        status = "rejected";
        action = "withdrawal-request";
      } else if (wStatus === "pending" || wStatus === "requested") {
        status = "requested";
        action = "withdrawal-request";
      }
      return {
        id: w?._id?.toString?.() || w?.id,
        date: w?.createdAt || w?.date || new Date(),
        action,
        amount: typeof w?.amount === "number" ? w.amount : undefined,
        status: status as any,
        description,
        meta: w || {},
      };
    };

    let recentInvites: any[] = [];
    try {
      const anyInvitationRepo = invitationRepo as any;
      if (
        typeof anyInvitationRepo.findRecentInvitationsByInviterId === "function"
      ) {
        recentInvites =
          await anyInvitationRepo.findRecentInvitationsByInviterId(userId, 50);
      } else if (
        typeof anyInvitationRepo.findInvitationsByInviterId === "function"
      ) {
        recentInvites = await anyInvitationRepo.findInvitationsByInviterId(
          userId
        );
      }
    } catch (e) {
      // silently ignore if method not available
    }

    const mapInviteToActivity = (i: any) => {
      const iStatus = (i?.status || "").toLowerCase();
      // if invite completed/accepted, mark completed; else pending
      const status =
        iStatus === "completed" || iStatus === "accepted" || i?.completedAt
          ? "completed"
          : "pending";
      return {
        id: i?._id?.toString?.() || i?.id,
        date: i?.createdAt || i?.date || i?.sentAt || new Date(),
        email: i?.inviteeEmail || i?.email || i?.invitee?.email,
        name: i?.inviteeName || i?.name,
        action: "signup",
        status: status as any,
        referralCode: i?.referralCode,
        meta: i || {},
      };
    };

    const activity = [
      ...((Array.isArray(recentInvites) ? recentInvites : []) as any[]).map(
        mapInviteToActivity
      ),
      ...((Array.isArray(recentRewards) ? recentRewards : []) as any[]).map(
        mapRewardToActivity
      ),
      ...(
        (Array.isArray(recentWithdrawals) ? recentWithdrawals : []) as any[]
      ).map(mapWithdrawalToActivity),
    ]
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.date as any).getTime() - new Date(a.date as any).getTime()
      )
      .slice(0, 100);

    try {
      const itemsNeedingEmail = activity
        .map((a: any, idx: number) => ({ a, idx }))
        .filter(
          ({ a }) => !a?.email && (a?.meta?.inviteeId || a?.meta?.invitee?.id)
        );

      // Collect unique userIds to fetch in batches
      const userIds = Array.from(
        new Set(
          itemsNeedingEmail
            .map(({ a }) => a?.meta?.inviteeId || a?.meta?.invitee?.id)
            .filter(Boolean)
        )
      ) as string[];

      // Helper: chunk an array
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const res: T[][] = [];
        for (let i = 0; i < arr.length; i += size)
          res.push(arr.slice(i, i + size));
        return res;
      };

      // Batch fetch auth users by IDs to avoid N calls
      const idChunks = chunk(userIds, 50); // safe batch size
      const userEmailMap = new Map<string, string | undefined>();

      for (const ids of idChunks) {
        try {
          const users = await Promise.all(
            ids.map(async (id) => {
              try {
                return await authAdmin.users.getUser(id);
              } catch {
                return null;
              }
            })
          );
          for (const u of users) {
            if (!u) continue;
            const uid = u.id;
            const email =
              u.primaryEmailAddress?.emailAddress ||
              u.emailAddresses?.[0]?.emailAddress;
            if (uid) userEmailMap.set(uid, email);
          }
        } catch (_) {}
      }

      for (const { a, idx } of itemsNeedingEmail) {
        const uid = a?.meta?.inviteeId || a?.meta?.invitee?.id;
        if (!uid) continue;
        const email = userEmailMap.get(uid);
        if (email) {
          const item: any = activity[idx];
          if (item) item.email = email;
        }
      }
    } catch (e) {}

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
        activity,
        activitySummary: {
          paidToDate: parseFloat(totalWithdrawn.toFixed(2)),
          requestedSoFar: parseFloat(pendingWithdrawals.toFixed(2)),
          remainingToPay: parseFloat(availableBalance.toFixed(2)),
        },
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
