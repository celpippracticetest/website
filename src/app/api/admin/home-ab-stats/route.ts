import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import {
  HOME_AB_EXPERIMENT_VARIANTS,
  type HomeAbExperimentVariant,
} from "@/lib/homeAbTest";

export const runtime = "nodejs";

type CountRow = { variant: string; eventType: string; count: number };

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
      .collection("home_ab_events")
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { variant: "$variant", eventType: "$eventType" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            variant: "$_id.variant",
            eventType: "$_id.eventType",
            count: 1,
          },
        },
      ])
      .toArray()) as CountRow[];

    const empty = { page_view: 0, checkout_started: 0, purchase: 0 };
    const byVariant = {
      passport: { ...empty },
      legacy: { ...empty },
    } as Record<HomeAbExperimentVariant, typeof empty>;

    for (const row of rows) {
      if (row.variant !== "passport" && row.variant !== "legacy") continue;
      const v = row.variant as HomeAbExperimentVariant;
      const key = row.eventType;
      if (key === "page_view" || key === "checkout_started" || key === "purchase") {
        byVariant[v][key] = row.count;
      }
    }

    const summarize = (variant: HomeAbExperimentVariant) => {
      const v = byVariant[variant];
      const views = v.page_view;
      const checkouts = v.checkout_started;
      const purchases = v.purchase;
      return {
        variant,
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
      experiment: "passport_vs_legacy",
      variants: HOME_AB_EXPERIMENT_VARIANTS.map((v) => summarize(v)),
      raw: rows,
    });
  } catch (e) {
    console.error("home-ab-stats:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
