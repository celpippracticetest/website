import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/express";

import mongoClient from "@/lib/mongodb";
import { WithdrawalRequestRepository } from "@/repositories/withdrawal-request.repo";
import { sendEmailWithSender } from "@/lib/email/sender-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const metadata = user.publicMetadata as any;

    return metadata?.roles?.includes("admin");
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let statusFilter: any = (searchParams.get("status") || "all").toLowerCase();
    if (
      !["pending", "approved", "paid", "rejected", "all"].includes(statusFilter)
    ) {
      statusFilter = "all";
    }

    // The rest of the logic (query building, fetching from Mongo, etc.) remains unchanged.
    const withdrawalRepo = new WithdrawalRequestRepository(mongoClient);
    await withdrawalRepo.ensureIndexes();

    // For demonstration, assuming you have a method that takes statusFilter.
    // If not, you may need to adjust the repository call accordingly.
    let requests;
    console.log(statusFilter, "statusFilter");

    if (statusFilter === "all") {
      requests = await withdrawalRepo.findAllWithdrawalRequests();
    } else {
      requests = await withdrawalRepo.findWithdrawalRequestsByStatus(
        statusFilter
      );
    }

    console.log(requests, "reqyesrs");

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    console.error("Admin withdrawal requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(userId))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { requestId, status, adminNotes } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: "Request ID and status are required" },
        { status: 400 }
      );
    }

    const withdrawalRepo = new WithdrawalRequestRepository(mongoClient);
    await withdrawalRepo.ensureIndexes();

    const updatedRequest = await withdrawalRepo.updateWithdrawalStatus(
      requestId,
      status,
      adminNotes
    );

    if (!updatedRequest) {
      return NextResponse.json(
        { error: "Withdrawal request not found" },
        { status: 404 }
      );
    }

    // Send email notification to user about status change
    if (status === "paid") {
      await sendPaymentConfirmationEmail(updatedRequest);
    } else if (status === "rejected") {
      await sendRejectionEmail(updatedRequest, adminNotes);
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request updated successfully",
      data: updatedRequest,
    });
  } catch (error: any) {
    console.error("Admin update withdrawal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendPaymentConfirmationEmail(withdrawalRequest: any) {
  try {
    if (!process.env.SENDER_API_TOKEN) {
      throw new Error("Missing required env: SENDER_API_TOKEN");
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Payment Confirmed! 🎉</h2>
        
        <p>Your withdrawal request has been processed and payment has been sent to your PayPal account.</p>
        
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Payment Details</h3>
          <p><strong>Amount:</strong> $${withdrawalRequest.amount}</p>
          <p><strong>PayPal Email:</strong> ${withdrawalRequest.paypalEmail}</p>
          <p><strong>Processed Date:</strong> ${new Date(
            withdrawalRequest.processedAt
          ).toLocaleString()}</p>
        </div>
        
        <p>Thank you for using our referral program!</p>
      </div>
    `;

    console.log(
      "[withdrawal-email] sending payment confirmation to",
      withdrawalRequest.userEmail
    );
    await sendEmailWithSender({
      from:
        process.env.FROM_EMAIL || `Celpip Practice <${process.env.SMTP_USER}>`,
      to: withdrawalRequest.userEmail,
      subject: `Payment Confirmed - $${withdrawalRequest.amount}`,
      html: emailHtml,
    });
    console.log("[withdrawal-email] Sender API email sent successfully");
  } catch (error) {
    console.error("Failed to send payment confirmation email:", error);
  }
}

async function sendRejectionEmail(withdrawalRequest: any, adminNotes: string) {
  try {
    if (!process.env.SENDER_API_TOKEN) {
      throw new Error("Missing required env: SENDER_API_TOKEN");
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #EF4444;">Withdrawal Request Update</h2>
        
        <p>Your withdrawal request has been reviewed and unfortunately could not be approved at this time.</p>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #DC2626;">Request Details</h3>
          <p><strong>Amount:</strong> $${withdrawalRequest.amount}</p>
          <p><strong>PayPal Email:</strong> ${withdrawalRequest.paypalEmail}</p>
          <p><strong>Admin Notes:</strong> ${
            adminNotes || "No specific reason provided"
          }</p>
        </div>
        
        <p>If you have any questions, please contact our support team.</p>
      </div>
    `;

    console.log(
      "[withdrawal-email] sending rejection to",
      withdrawalRequest.userEmail
    );
    await sendEmailWithSender({
      from:
        process.env.FROM_EMAIL || `Celpip Practice <${process.env.SMTP_USER}>`,
      to: withdrawalRequest.userEmail,
      subject: `Withdrawal Request Update - $${withdrawalRequest.amount}`,
      html: emailHtml,
    });
    console.log("[withdrawal-email] Sender API email sent successfully");
  } catch (error) {
    console.error("Failed to send rejection email:", error);
  }
}
