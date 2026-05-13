import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import type { PricingAbLayout } from "@/lib/pricingAbTest";

export const runtime = "nodejs";

type CountRow = { layout: PricingAbLayout; eventType: string; count: number };

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const daysParam = req.nextUrl.searchParams.get("days");
    const days = Math.min(365, Math.max(1, Number.parseInt(daysParam || "30", 10) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const db = await getDb();
    const rows = (await db
      .collection("pricing_ab_events")
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { layout: "$layout", eventType: "$eventType" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            layout: "$_id.layout",
            eventType: "$_id.eventType",
            count: 1,
          },
        },
      ])
      .toArray()) as CountRow[];

    const byLayout = {
      two_card: { page_view: 0, checkout_started: 0, purchase: 0 },
      switch_toggle: { page_view: 0, checkout_started: 0, purchase: 0 },
    } as Record<PricingAbLayout, Record<string, number>>;

    for (const row of rows) {
      if (row.layout !== "two_card" && row.layout !== "switch_toggle") continue;
      const key = row.eventType;
      if (key === "page_view" || key === "checkout_started" || key === "purchase") {
        byLayout[row.layout][key] = row.count;
      }
    }

    const summarize = (layout: PricingAbLayout) => {
      const v = byLayout[layout];
      const views = v.page_view;
      const checkouts = v.checkout_started;
      const purchases = v.purchase;
      return {
        layout,
        page_views: views,
        checkout_started: checkouts,
        purchases,
        checkout_rate: views > 0 ? checkouts / views : 0,
        purchase_rate: views > 0 ? purchases / views : 0,
        purchase_per_checkout: checkouts > 0 ? purchases / checkouts : 0,
      };
    };

    return NextResponse.json({
      days,
      since: since.toISOString(),
      variants: [summarize("two_card"), summarize("switch_toggle")],
      raw: rows,
    });
  } catch (e) {
    console.error("pricing-ab-stats:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
