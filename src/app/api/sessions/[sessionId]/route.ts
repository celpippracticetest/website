import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/express";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  try {
    await clerkClient.sessions.revokeSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke session:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
