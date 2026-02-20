import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { z } from "zod";
import mongoClient from "@/lib/mongodb";
import { ReferralRewardRepository } from "@/repositories/referral-reward.repo";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal-request.repo";
import { ReferralInvitationRepository } from "@/repositories/referral-invitation.repo";
import { clerkClient } from "@clerk/nextjs/server";
import { sendEmailWithSender } from "@/lib/email/sender-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WithdrawalRequestSchema = z.object({
  amount: z.number().min(5, "Minimum withdrawal amount is $5"),
  paypalEmail: z.string().email("Valid PayPal email is required"),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = WithdrawalRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { amount, paypalEmail } = parsed.data;

    // Get user information (clerkClient is an object, not a function)
    const cc = await clerkClient();
    const user = await cc.users.getUser(userId);
    const userEmail =
      user.emailAddresses.find((e: any) => e.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Initialize repositories
    const rewardRepo = new ReferralRewardRepository(mongoClient);
    const withdrawalRepo = new WithdrawalRequestRepository(mongoClient);

    await rewardRepo.ensureIndexes();
    await withdrawalRepo.ensureIndexes();

    // Check if user has enough confirmed rewards
    const totalConfirmedRewards = await rewardRepo.getTotalConfirmedRewards(
      userId
    );
    const totalPendingWithdrawals =
      await withdrawalRepo.getPendingWithdrawalAmount(userId);

    // Work in integer cents to avoid floating-point rounding issues
    const availableCents = Math.max(
      0,
      Math.round((totalConfirmedRewards - totalPendingWithdrawals) * 100)
    );
    const requestedCents = Math.max(0, Math.round(amount * 100));

    if (requestedCents > availableCents) {
      return NextResponse.json(
        {
          error: `Insufficient funds. Available: $${(
            availableCents / 100
          ).toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // Get referral statistics
    const invitationRepo = new ReferralInvitationRepository(mongoClient);
    await invitationRepo.ensureIndexes();

    const totalInvitees = await invitationRepo.getTotalInvitations(userId);
    const referralCode = (user.publicMetadata as any)?.referralCode || "N/A";
    const inviteeEmails = await invitationRepo.getInviteeEmailsByInviterId(
      userId
    );

    // Get user's plan and purchase info from metadata
    const planPurchased = (user.publicMetadata as any)?.plan || "free";
    const purchaseDate = user.createdAt || new Date();

    // Create withdrawal request
    const withdrawalRequest = await withdrawalRepo.createWithdrawalRequest({
      userId,
      amount,
      paypalEmail,
      status: "pending",
      userEmail,
      referralStats: {
        totalInvitees,
        totalReward: totalConfirmedRewards,
        referralCode,
        inviteeEmails,
      },
      planPurchased,
      purchaseDate: new Date(purchaseDate),
    });

    // Send email notification to admin
    await sendWithdrawalNotificationEmail({
      withdrawalRequest,
      user,
      referralStats: {
        totalInvitees,
        totalReward: totalConfirmedRewards,
        referralCode,
        inviteeEmails,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: withdrawalRequest,
    });
  } catch (error: any) {
    console.error("Withdrawal request error:", {
      message: (error as any)?.message,
      stack: (error as any)?.stack,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendWithdrawalNotificationEmail({
  withdrawalRequest,
  user,
  referralStats,
}: {
  withdrawalRequest: any;
  user: any;
  referralStats: any;
}) {
  const { SENDER_API_TOKEN } = process.env as Record<string, string | undefined>;
  if (!SENDER_API_TOKEN) {
    throw new Error("Missing required env: SENDER_API_TOKEN");
  }
  try {
    const adminEmail =
      process.env.ADMIN_EMAIL ||
      process.env.FROM_EMAIL ||
      process.env.SMTP_USER;
    if (!adminEmail) {
      throw new Error(
        "No admin email configured (ADMIN_EMAIL/FROM_EMAIL/SMTP_USER)"
      );
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Withdrawal Request</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Request Details</h3>
          <p><strong>Amount:</strong> $${withdrawalRequest.amount}</p>
          <p><strong>PayPal Email:</strong> ${withdrawalRequest.paypalEmail}</p>
          <p><strong>Request Date:</strong> ${new Date(
            withdrawalRequest.createdAt
          ).toLocaleString()}</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">User Information</h3>
          <p><strong>User ID:</strong> ${user.id}</p>
          <p><strong>User Email:</strong> ${
            user.emailAddresses[0]?.emailAddress
          }</p>
          <p><strong>Name:</strong> ${user.firstName || ""} ${
      user.lastName || ""
    }</p>
          <p><strong>Plan:</strong> ${withdrawalRequest.planPurchased}</p>
          <p><strong>Purchase Date:</strong> ${new Date(
            withdrawalRequest.purchaseDate
          ).toLocaleDateString()}</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Referral Statistics</h3>
          <p><strong>Referral Code:</strong> ${referralStats.referralCode}</p>
          <p><strong>Total Invitees (confirmed):</strong> ${
            referralStats.totalInvitees
          }</p>
          <p><strong>Total Reward Earned (confirmed):</strong> $${referralStats.totalReward.toFixed(
            2
          )}</p>
          ${
            Array.isArray(referralStats?.inviteeEmails) &&
            referralStats.inviteeEmails.length > 0
              ? `<div style="margin-top:10px;">
                   <p><strong>Invitee Emails (${
                     referralStats.inviteeEmails.length
                   }):</strong></p>
                   <ul style="margin:6px 0 0 18px; padding:0;">
                     ${referralStats.inviteeEmails
                       .map(
                         (em: string) =>
                           `<li style="margin:3px 0; font-size: 13px;">${em}</li>`
                       )
                       .join("")}
                   </ul>
                 </div>`
              : ``
          }
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2d5a2d;">
            <strong>Action Required:</strong> Please process this withdrawal request manually and update the status in the admin panel.
          </p>
        </div>
      </div>
    `;

    console.log("[withdrawal-request] sending email", {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: adminEmail,
      provider: "sender.net",
    });

    await sendEmailWithSender({
      from:
        process.env.FROM_EMAIL || `Celpip Practice <${process.env.SMTP_USER}>`,
      to: [adminEmail, "tejareh.amir@gmail.com"],
      subject: `Withdrawal Request - $${withdrawalRequest.amount} - ${user.emailAddresses[0]?.emailAddress}`,
      html: emailHtml,
    });
    console.log("[withdrawal-request] Sender API email sent successfully");
  } catch (error) {
    console.error("Failed to send withdrawal notification email:", error);
    throw error;
  }
}
