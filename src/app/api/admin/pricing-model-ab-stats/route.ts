import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import { getDb } from "@/lib/appDocumentsClient";
import {
  PRICING_MODEL_AB_VARIANTS,
  type PricingModelAbVariant,
} from "@/lib/pricingModelAbTest";

export const runtime = "nodejs";

type CountRow = { model: string; eventType: string; count: number };

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
      .collection("pricing_model_ab_events")
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { model: "$model", eventType: "$eventType" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            model: "$_id.model",
            eventType: "$_id.eventType",
            count: 1,
          },
        },
      ])
      .toArray()) as CountRow[];

    const empty = { page_view: 0, checkout_started: 0, purchase: 0 };
    const byModel = Object.fromEntries(
      PRICING_MODEL_AB_VARIANTS.map((model) => [model, { ...empty }]),
    ) as Record<PricingModelAbVariant, typeof empty>;

    for (const row of rows) {
      if (row.model !== "period" && row.model !== "weekly_equiv") continue;
      const model = row.model as PricingModelAbVariant;
      const key = row.eventType;
      if (key === "page_view" || key === "checkout_started" || key === "purchase") {
        byModel[model][key] = row.count;
      }
    }

    const summarize = (model: PricingModelAbVariant) => {
      const stats = byModel[model];
      const views = stats.page_view || 0;
      const checkouts = stats.checkout_started || 0;
      const purchases = stats.purchase || 0;
      return {
        model,
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
      variants: PRICING_MODEL_AB_VARIANTS.map(summarize),
    });
  } catch (e) {
    console.error("pricing-model-ab-stats:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
