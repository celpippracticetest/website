import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import client from "@/lib/mongodb";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedRequestContext(request);
    const user = ctx?.user ?? null;
    const isAuthenticated = !!user;

    // Check user plan
    const userPlan = user?.publicMetadata?.plan as string;
    const isFreeUser = userPlan === "free";
    const isPremiumUser = hasPaidPracticeAccess(
      userPlan,
      user?.publicMetadata?.purchaseDate
    );
    const isGuest = !isAuthenticated;

    // Only check limits for free users and guests
    if ((isFreeUser || isGuest) && !isPremiumUser) {
      const db = client.db();
      const messageCountsCollection = db.collection("messageCounts");

      // Create a unique identifier for the user/guest
      const userIdentifier = isAuthenticated
        ? user.id
        : `guest_${request.headers.get("x-forwarded-for") || "unknown"}`;

      // Get current message count from database
      const existingRecord = await messageCountsCollection.findOne({
        userIdentifier: userIdentifier,
        date: new Date().toISOString().split("T")[0], // Today's date
      });

      const currentCount = existingRecord?.count || 0;

      return NextResponse.json({
        count: currentCount,
        limit: 1,
        canSend: currentCount < 1,
      });
    }

    // Premium users have unlimited access
    return NextResponse.json({
      count: 0,
      limit: -1, // -1 means unlimited
      canSend: true,
    });
  } catch (error) {
    console.error("Error checking message limit:", error);
    return NextResponse.json(
      { error: "Failed to check message limit" },
      { status: 500 }
    );
  }
}
