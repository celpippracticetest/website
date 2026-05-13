import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import client from "@/lib/appDocumentsClient";

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
    const roles = sessionClaims?.metadata?.roles;
    const isAdmin = Array.isArray(roles) && roles.some((r) => r === "admin");

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
    const surveysCollection = db.collection("cancellation_surveys");

    const [events, surveys] = await Promise.all([
      eventsCollection
        .find({
          createdAt: { $gte: fromDate },
          eventName: {
            $in: ["flow_opened", "subscription_cancelled_success", ...KEEP_EVENTS],
          },
        })
        .project({
          userId: 1,
          flowId: 1,
          eventName: 1,
          reason: 1,
          createdAt: 1,
        })
        .sort({ createdAt: 1 })
        .toArray(),
      surveysCollection
        .find({ createdAt: { $gte: fromDate } })
        .project({
          userId: 1,
          reason: 1,
          createdAt: 1,
        })
        .sort({ createdAt: 1 })
        .toArray(),
    ]);

    const flows = new Map<
      string,
      {
        date: string;
        userDayKey: string;
        started: boolean;
        kept: boolean;
        cancelled: boolean;
        reason: string | null;
      }
    >();
    const flowKeyByUserDay = new Map<string, string>();

    for (const event of events) {
      const createdAt = event.createdAt instanceof Date ? event.createdAt : new Date();
      const eventDate = createdAt.toISOString().slice(0, 10);
      const userDayKey = `${event.userId ?? "unknown"}:${eventDate}`;
      const flowKey =
        typeof event.flowId === "string" && event.flowId
          ? event.flowId
          : userDayKey;
      const current = flows.get(flowKey) ?? {
        date: eventDate,
        userDayKey,
        started: false,
        kept: false,
        cancelled: false,
        reason: null,
      };

      if (event.eventName === "flow_opened") {
        current.started = true;
      } else if (event.eventName === "subscription_cancelled_success") {
        current.cancelled = true;
      } else if (typeof event.eventName === "string" && KEEP_EVENTS.includes(event.eventName)) {
        current.kept = true;
        if (!current.reason && typeof event.reason === "string" && event.reason) {
          current.reason = event.reason;
        }
      }

      flows.set(flowKey, current);
      if (!flowKeyByUserDay.has(userDayKey)) {
        flowKeyByUserDay.set(userDayKey, flowKey);
      }
    }

    // Older data can have survey records without full event telemetry.
    // Count each survey as a started flow fallback so dashboard numbers stay consistent.
    for (const survey of surveys) {
      const createdAt =
        survey.createdAt instanceof Date ? survey.createdAt : new Date();
      const surveyDate = createdAt.toISOString().slice(0, 10);
      const userDayKey = `${survey.userId ?? "unknown"}:${surveyDate}`;
      const existingFlowKey = flowKeyByUserDay.get(userDayKey);
      const surveyKey = existingFlowKey ?? `${userDayKey}:survey`;
      const current = flows.get(surveyKey) ?? {
        date: surveyDate,
        userDayKey,
        started: false,
        kept: false,
        cancelled: false,
        reason: null,
      };

      current.started = true;
      if (!current.reason && typeof survey.reason === "string" && survey.reason) {
        current.reason = survey.reason;
      }

      flows.set(surveyKey, current);
      if (!flowKeyByUserDay.has(userDayKey)) {
        flowKeyByUserDay.set(userDayKey, surveyKey);
      }
    }

    const trendBucket = new Map<
      string,
      { started: number; kept: number; cancelled: number }
    >();
    const keepReasonBucket = new Map<string, number>();

    const startedByDate = new Map<string, number>();
    for (const survey of surveys) {
      const createdAt =
        survey.createdAt instanceof Date ? survey.createdAt : new Date();
      const surveyDate = createdAt.toISOString().slice(0, 10);
      startedByDate.set(surveyDate, (startedByDate.get(surveyDate) || 0) + 1);
    }

    const started = surveys.length;
    let kept = 0;
    let cancelled = 0;

    for (const flow of flows.values()) {
      if (!flow.started) continue;

      const outcomeKept = flow.kept && !flow.cancelled;
      const outcomeCancelled = flow.cancelled;

      if (outcomeKept) {
        kept += 1;
        const reasonKey = flow.reason || "unknown";
        keepReasonBucket.set(reasonKey, (keepReasonBucket.get(reasonKey) || 0) + 1);
      }

      if (outcomeCancelled) {
        cancelled += 1;
      }

      const bucket = trendBucket.get(flow.date) || {
        started: startedByDate.get(flow.date) || 0,
        kept: 0,
        cancelled: 0,
      };
      if (outcomeKept) bucket.kept += 1;
      if (outcomeCancelled) bucket.cancelled += 1;
      trendBucket.set(flow.date, bucket);
    }

    for (const [date, count] of startedByDate.entries()) {
      if (!trendBucket.has(date)) {
        trendBucket.set(date, { started: count, kept: 0, cancelled: 0 });
      }
    }

    const reasonBreakdown = Array.from(keepReasonBucket.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    const trend = Array.from(trendBucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([date, counts]) => [
        { _id: { date, eventName: "flow_opened" }, count: counts.started },
        {
          _id: { date, eventName: "subscription_cancelled_success" },
          count: counts.cancelled,
        },
        { _id: { date, eventName: "kept_flow_outcome" }, count: counts.kept },
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
      reasonBreakdown,
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
