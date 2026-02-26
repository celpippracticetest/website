import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import client from "@/lib/mongodb";

const KEEP_EVENTS = [
  "keep_subscription_clicked",
  "kept_with_discount",
  "kept_on_final_confirmation",
  "pause_subscription_success",
  "contact_support_selected",
];

export async function GET(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.roles?.includes("admin");

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const daysParam = Number.parseInt(searchParams.get("days") || "30", 10);
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const db = client.db();
    const eventsCollection = db.collection("cancellation_flow_events");

    const baseFilter = { createdAt: { $gte: fromDate } };

    const [started, kept, cancelled, reasonBreakdown, trend] = await Promise.all([
      eventsCollection.countDocuments({
        ...baseFilter,
        eventName: "flow_opened",
      }),
      eventsCollection.countDocuments({
        ...baseFilter,
        eventName: { $in: KEEP_EVENTS },
      }),
      eventsCollection.countDocuments({
        ...baseFilter,
        eventName: "subscription_cancelled_success",
      }),
      eventsCollection
        .aggregate([
          { $match: { ...baseFilter, eventName: { $in: KEEP_EVENTS } } },
          {
            $group: {
              _id: { $ifNull: ["$reason", "unknown"] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray(),
      eventsCollection
        .aggregate([
          {
            $match: {
              ...baseFilter,
              eventName: {
                $in: ["flow_opened", "subscription_cancelled_success", ...KEEP_EVENTS],
              },
            },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                eventName: "$eventName",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.date": 1 } },
        ])
        .toArray(),
    ]);

    const keepRate = started > 0 ? Math.round((kept / started) * 10000) / 100 : 0;
    const cancelRate =
      started > 0 ? Math.round((cancelled / started) * 10000) / 100 : 0;

    return NextResponse.json({
      days,
      summary: {
        started,
        kept,
        cancelled,
        keepRate,
        cancelRate,
      },
      reasonBreakdown: reasonBreakdown.map((item) => ({
        reason: item._id,
        count: item.count,
      })),
      trend,
    });
  } catch (error) {
    console.error("Error fetching cancellation retention report:", error);
    return NextResponse.json(
      { error: "Failed to fetch cancellation retention report" },
      { status: 500 }
    );
  }
}
