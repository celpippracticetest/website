import mongoClient from "@/lib/mongodb";
import { LeadCaptureLeadRepository } from "@/repositories/lead-capture-lead.repo";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

function toCsvValue(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const repo = new LeadCaptureLeadRepository(mongoClient);
    await repo.ensureIndexes();
    const leads = await repo.getLeadsForExport(10000);

    const header = [
      "Lead Capture Campaign",
      "First Name",
      "Email",
      "Date Subscribed",
      "Source/Page URL",
      "Sender Group ID",
      "Trigger Source",
      "Sender Sync Status",
    ];

    const rows = leads.map((lead) => [
      lead.leadCaptureName || "",
      lead.firstName,
      lead.email,
      lead.subscribedAt?.toISOString?.() || "",
      lead.sourceUrl,
      lead.senderGroupId || "",
      lead.triggerSource,
      lead.senderSyncStatus,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => toCsvValue(cell)).join(","))
      .join("\n");

    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="lead-capture-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error("[admin lead-capture export] GET failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to export leads." }, { status: 500 });
  }
}
