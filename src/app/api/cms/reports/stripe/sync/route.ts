import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { StripeReportingRepository } from "@/repositories/stripe-reporting.repo";
import { syncStripeReportingData } from "@/lib/stripe/reporting-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncMode = "till_now" | "range";

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ensureAdmin() {
  const user = await currentUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authenticate = await auth();
  const isAdmin = authenticate.sessionClaims?.metadata?.roles?.includes("admin");
  if (!isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const admin = await ensureAdmin();
    if (!admin.ok) return admin.response;

    const body = await request.json().catch(() => ({}));
    const mode: SyncMode = body?.mode === "range" ? "range" : "till_now";

    const fromDate = parseDate(body?.fromDate);
    const toDate = parseDate(body?.toDate) ?? new Date();

    if (mode === "range" && !fromDate) {
      return NextResponse.json(
        { error: "fromDate is required for range mode" },
        { status: 400 }
      );
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { error: "fromDate cannot be after toDate" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const repo = new StripeReportingRepository(db);
    await repo.ensureIndexes();

    const result = await syncStripeReportingData(repo, {
      fromDate: mode === "range" ? fromDate ?? undefined : undefined,
      toDate: mode === "range" ? toDate : undefined,
    });

    return NextResponse.json({
      success: true,
      mode,
      fromDate: mode === "range" && fromDate ? fromDate.toISOString() : null,
      toDate: mode === "range" ? toDate.toISOString() : null,
      ...result,
    });
  } catch (error) {
    console.error("CMS Stripe sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync Stripe data" },
      { status: 500 }
    );
  }
}
