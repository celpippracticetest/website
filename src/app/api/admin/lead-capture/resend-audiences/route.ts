import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listResendAudiences } from "@/lib/email/resend-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const authenticate = await auth();
  const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
  if (!isAdmin) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function GET() {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const audiences = await listResendAudiences();
    return NextResponse.json({ ok: true, data: audiences }, { status: 200 });
  } catch (error) {
    console.error("[admin lead-capture resend-audiences] GET failed:", error);
    const message = error instanceof Error ? error.message : "Failed to load Resend audiences.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
