import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import client from "@/lib/appDocumentsClient";

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await props.params;

    const authenticate = await auth();
    const isAdmin =
      sessionClaimsHasAdminRole(authenticate.sessionClaims);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const authAdmin = await appUserAdmin();
    const { data: sessions } = await authAdmin.sessions.getSessionList({ userId });
    type SessionRow = { id?: string; status?: string };
    const sessionRows = (sessions ?? []) as SessionRow[];
    const activeSessions = sessionRows.filter((session) => session.status === "active");

    let revokedCount = 0;
    for (const session of activeSessions) {
      if (!session.id) continue;
      await authAdmin.sessions.revokeSession(session.id);
      revokedCount += 1;
    }

    // Admin revoke should not enforce waiting period.
    const db = client.db();
    await db.collection("account_device_restrictions").deleteMany({ userId });

    return NextResponse.json({
      success: true,
      revokedCount,
      message: `Revoked ${revokedCount} active session${revokedCount === 1 ? "" : "s"} without applying 48-hour restriction.`,
    });
  } catch (error: any) {
    console.error("Error revoking user sessions:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to revoke user sessions" },
      { status: 500 }
    );
  }
}
