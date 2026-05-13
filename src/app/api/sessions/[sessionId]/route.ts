import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import {
  addDeletedDeviceRestriction,
  getStableDeviceKeyFromSession,
} from "@/lib/accountDeviceRestriction";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  try {
    const authAdmin = await appUserAdmin();
    const targetSession = (await authAdmin.sessions.getSession(sessionId)) as {
      userId: string;
    } | null;
    if (!targetSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (targetSession.userId !== userId) {
      return NextResponse.json(
        { error: "You can only revoke your own sessions." },
        { status: 403 }
      );
    }

    await authAdmin.sessions.revokeSession(sessionId);

    const deviceKey = getStableDeviceKeyFromSession(targetSession as any);
    if (!deviceKey) {
      return NextResponse.json({
        success: true,
        restrictionApplied: false,
      });
    }

    const { expiresAt } = await addDeletedDeviceRestriction({
      userId,
      deviceKey,
      sourceSessionId: sessionId,
    });

    return NextResponse.json({
      success: true,
      restrictionApplied: true,
      restrictedUntil: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to revoke session:", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
