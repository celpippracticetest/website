import { auth, currentUser, sessionClaimsHasAdminRole } from "@/lib/auth/server-auth";
import { NextResponse } from "next/server";
import { getNurtureEmailStatsSummary } from "@/lib/nurture-email/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authenticate = await auth();
  const isAdmin = sessionClaimsHasAdminRole(authenticate.sessionClaims);
  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

export async function GET() {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const data = await getNurtureEmailStatsSummary();
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error("[admin nurture email stats] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load stats." }, { status: 500 });
  }
}
