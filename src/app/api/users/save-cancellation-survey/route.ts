import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("cancellation_surveys").updateOne(
      { userId },
      {
        $set: {
          userId,
          ...data,
          flowId: typeof data?.flowId === "string" ? data.flowId : null,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving cancellation survey:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save survey" },
      { status: 500 }
    );
  }
}
