import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedRequestContext(request);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const checkoutsCollection = db.collection("checkouts");

    // Check if user has any completed checkout
    const hasEverPurchased = await checkoutsCollection.findOne({
      userId: ctx.userId,
      status: "complete",
    });

    return NextResponse.json({
      hasEverPurchased: !!hasEverPurchased,
    });
  } catch (error) {
    console.error("Error checking purchase history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
