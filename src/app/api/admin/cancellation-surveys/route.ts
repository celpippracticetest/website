import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const isAdmin =
      sessionClaims?.metadata?.roles?.includes("admin");
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const db = client.db();
    const surveysCollection = db.collection("cancellation_surveys");

    const skip = (page - 1) * limit;

    const [surveys, totalCount] = await Promise.all([
      surveysCollection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      surveysCollection.countDocuments({}),
    ]);

    return NextResponse.json({
      surveys,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching cancellation surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}
