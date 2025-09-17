import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = client.db();
    const checkoutsCollection = db.collection("checkouts");

    // Check if user has any completed checkout
    const hasEverPurchased = await checkoutsCollection.findOne({
      userId: user.id,
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
