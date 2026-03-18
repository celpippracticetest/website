import mongoClient from "@/lib/mongodb";
import { LeadCaptureLeadRepository } from "@/repositories/lead-capture-lead.repo";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
    const leadCaptureId =
      request.nextUrl.searchParams.get("leadCaptureId")?.trim() || undefined;
    const page = parseInt(request.nextUrl.searchParams.get("page") ?? "0", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10);

    const repo = new LeadCaptureLeadRepository(mongoClient);
    await repo.ensureIndexes();
    const result = await repo.getLeads({ search, leadCaptureId }, page, limit);

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[admin lead-capture leads] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to load leads." }, { status: 500 });
  }
}
