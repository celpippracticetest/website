import { NextRequest, NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import clientPromise from "@/lib/appDocumentsClient";

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const flowId =
      typeof body?.flowId === "string" ? (body.flowId as string) : null;
    const client = await clientPromise;
    const db = client.db();
    await db.collection("account_deletion_flow_events").insertOne({
      userId,
      flowId,
      eventName: "account_deleted_success",
      step: "confirm",
      reason: typeof body?.reason === "string" ? body.reason : null,
      metadata: null,
      createdAt: new Date(),
    });

    const authAdmin = await appUserAdmin();
    await authAdmin.users.deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
