import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/appDocumentsClient";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";

/** Legacy FCM token storage. Pushwoosh targets users by Supabase user id via setUserId. */
const COLLECTION_NAME = "mobile_push_tokens";

export async function POST(request: NextRequest) {
  const authContext = await getAuthenticatedRequestContext(request);
  if (!authContext?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const token = body?.token?.toString().trim();
  const platform = body?.platform?.toString().trim() || "unknown";
  const deviceId = body?.deviceId?.toString().trim() || "unknown";

  if (!token) {
    return NextResponse.json(
      { error: "Push token is required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  await db.collection(COLLECTION_NAME).updateOne(
    {
      userId: authContext.userId,
      token,
    },
    {
      $set: {
        userId: authContext.userId,
        token,
        platform,
        deviceId,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const authContext = await getAuthenticatedRequestContext(request);
  if (!authContext?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const token = body?.token?.toString().trim();

  if (!token) {
    return NextResponse.json(
      { error: "Push token is required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  await db.collection(COLLECTION_NAME).deleteOne({
    userId: authContext.userId,
    token,
  });

  return NextResponse.json({ success: true });
}
