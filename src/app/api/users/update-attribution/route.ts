import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { gclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = body;

    // Filter out undefined/null values
    const attributionData: Record<string, string> = {};
    if (gclid) attributionData.gclid = gclid;
    if (utm_source) attributionData.utm_source = utm_source;
    if (utm_medium) attributionData.utm_medium = utm_medium;
    if (utm_campaign) attributionData.utm_campaign = utm_campaign;
    if (utm_content) attributionData.utm_content = utm_content;
    if (utm_term) attributionData.utm_term = utm_term;

    if (Object.keys(attributionData).length === 0) {
      return NextResponse.json({ message: "No attribution data provided" });
    }

    // Update Clerk metadata
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...attributionData,
        acquisitionDate: new Date().toISOString(),
      },
    });

    // Update MongoDB
    const db = client.db();
    await db.collection("users").updateOne(
      { clerkUserId: userId },
      { 
        $set: { 
          publicMetadata: {
            ...attributionData,
            acquisitionDate: new Date().toISOString(),
          }
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating attribution:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
