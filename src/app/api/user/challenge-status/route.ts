import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ active: false }, { status: 401 });
    }

    const db = await getDb();
    const userDoc = await db.collection("users").findOne(
      { clerkUserId: user.id },
      {
        projection: {
          challenge: 1,
        },
      }
    );

    const challenge = userDoc?.challenge as
      | {
          status?: string;
          targetClb?: number;
          windowDays?: number;
          refundPercent?: number;
          offerSource?: string;
          tierKey?: string;
          deadlineAt?: string | Date | null;
        }
      | undefined;

    if (!challenge || challenge.status !== "active") {
      return NextResponse.json({ active: false });
    }

    const deadline = challenge.deadlineAt ? new Date(challenge.deadlineAt) : null;
    const deadlineMs = deadline && !Number.isNaN(deadline.getTime()) ? deadline.getTime() : null;
    const daysLeft =
      deadlineMs !== null ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / 86400000)) : null;

    return NextResponse.json({
      active: true,
      targetClb: challenge.targetClb ?? null,
      windowDays: challenge.windowDays ?? null,
      refundPercent: challenge.refundPercent ?? null,
      offerSource: challenge.offerSource ?? null,
      tierKey: challenge.tierKey ?? null,
      deadlineAt: deadline ? deadline.toISOString() : null,
      daysLeft,
    });
  } catch (error) {
    console.error("challenge-status error:", error);
    return NextResponse.json({ active: false }, { status: 500 });
  }
}
