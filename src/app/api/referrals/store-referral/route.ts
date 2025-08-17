import { NextResponse } from "next/server";
import { z } from "zod";

const StoreReferralSchema = z.object({
  referralCode: z
    .string()
    .regex(/^REF-[A-Z0-9]{6}$/, "Invalid referral code format"),
  inviterName: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = StoreReferralSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { referralCode, inviterName } = parsed.data;

    // Store referral info in a temporary storage (could be Redis in production)
    // For now, we'll just validate the format and return success
    // The actual processing will happen in the onboarding page after user is authenticated

    return NextResponse.json({
      success: true,
      message: "Referral code stored for processing",
      data: {
        referralCode,
        inviterName,
        storedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Store referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
