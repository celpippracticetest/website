import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import clientPromise from "@/lib/appDocumentsClient";

export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const client = await clientPromise;
    const db = client.db();

    await db.collection("account_deletion_surveys").updateOne(
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
    console.error("Error saving account deletion survey:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save survey" },
      { status: 500 }
    );
  }
}
