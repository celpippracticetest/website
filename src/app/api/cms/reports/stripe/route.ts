import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/mongodb";
import { StripeReportingRepository } from "@/repositories/stripe-reporting.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endDate = parseDate(searchParams.get("endDate"), new Date());
    const startDate = parseDate(
      searchParams.get("startDate"),
      new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    );

    const db = await getDb();
    const repo = new StripeReportingRepository(db);
    await repo.ensureIndexes();
    const kpis = await repo.getKpis(startDate, endDate);

    return NextResponse.json({
      success: true,
      data: kpis,
    });
  } catch (error) {
    console.error("Error fetching Stripe data from DB:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe data" },
      { status: 500 }
    );
  }
}
