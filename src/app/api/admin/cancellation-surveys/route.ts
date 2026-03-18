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
const CANCEL_EVENT = "subscription_cancelled_success";

export async function GET(request: NextRequest) {
  try {
    const { sessionClaims } = await auth();
    const isAdmin =
      sessionClaims?.metadata?.roles?.includes("admin");
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const db = client.db();
    const surveysCollection = db.collection("cancellation_surveys");
    const eventsCollection = db.collection("cancellation_flow_events");

    const skip = (page - 1) * limit;

    const [surveys, totalCount] = await Promise.all([
      surveysCollection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      surveysCollection.countDocuments({}),
    ]);

    const surveyFlowIds = Array.from(
      new Set(
        surveys
          .map((survey) =>
            typeof survey.flowId === "string" && survey.flowId ? survey.flowId : null
          )
          .filter((value): value is string => Boolean(value))
      )
    );
    const surveyUserIds = Array.from(
      new Set(
        surveys
          .map((survey) =>
            typeof survey.userId === "string" && survey.userId ? survey.userId : null
          )
          .filter((value): value is string => Boolean(value))
      )
    );

    let matchedEvents: any[] = [];
    if (surveys.length > 0) {
      const surveyDates = surveys
        .map((survey) =>
          survey.createdAt instanceof Date ? survey.createdAt : new Date(survey.createdAt)
        )
        .filter((date) => Number.isFinite(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      const firstDate = surveyDates[0];
      const lastDate = surveyDates[surveyDates.length - 1];
      const firstDateWithBuffer = new Date(firstDate);
      firstDateWithBuffer.setDate(firstDateWithBuffer.getDate() - 1);
      const lastDateWithBuffer = new Date(lastDate);
      lastDateWithBuffer.setDate(lastDateWithBuffer.getDate() + 2);

      const eventOrFilters: Record<string, unknown>[] = [];
      if (surveyFlowIds.length > 0) {
        eventOrFilters.push({ flowId: { $in: surveyFlowIds } });
      }
      if (surveyUserIds.length > 0) {
        eventOrFilters.push({
          userId: { $in: surveyUserIds },
          createdAt: { $gte: firstDateWithBuffer, $lte: lastDateWithBuffer },
        });
      }

      if (eventOrFilters.length > 0) {
        matchedEvents = await eventsCollection
          .find({
            eventName: { $in: [...KEEP_EVENTS, CANCEL_EVENT] },
            $or: eventOrFilters,
          })
          .project({
            userId: 1,
            flowId: 1,
            eventName: 1,
            createdAt: 1,
          })
          .sort({ createdAt: 1 })
          .toArray();
      }
    }

    const eventsByFlowId = new Map<string, any[]>();
    const eventsByUserId = new Map<string, any[]>();

    for (const event of matchedEvents) {
      if (typeof event.flowId === "string" && event.flowId) {
        const list = eventsByFlowId.get(event.flowId) || [];
        list.push(event);
        eventsByFlowId.set(event.flowId, list);
      }
      if (typeof event.userId === "string" && event.userId) {
        const list = eventsByUserId.get(event.userId) || [];
        list.push(event);
        eventsByUserId.set(event.userId, list);
      }
    }

    const surveysWithOutcome = surveys.map((survey) => {
      const surveyDate =
        survey.createdAt instanceof Date ? survey.createdAt : new Date(survey.createdAt);
      const surveyTimestamp = surveyDate.getTime();
      const maxEventWindow = surveyTimestamp + 1000 * 60 * 60 * 24 * 2;

      let outcome: "kept" | "cancelled" | null = null;
      const flowEvents =
        typeof survey.flowId === "string" && survey.flowId
          ? eventsByFlowId.get(survey.flowId) || []
          : [];

      if (flowEvents.length > 0) {
        if (flowEvents.some((event) => event.eventName === CANCEL_EVENT)) {
          outcome = "cancelled";
        } else if (flowEvents.some((event) => KEEP_EVENTS.includes(event.eventName))) {
          outcome = "kept";
        }
      } else if (typeof survey.userId === "string" && survey.userId) {
        const userEvents = eventsByUserId.get(survey.userId) || [];
        const nearestEvent = userEvents.find((event) => {
          const eventDate =
            event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt);
          const eventTime = eventDate.getTime();
          return eventTime >= surveyTimestamp && eventTime <= maxEventWindow;
        });
        if (nearestEvent?.eventName === CANCEL_EVENT) {
          outcome = "cancelled";
        } else if (nearestEvent && KEEP_EVENTS.includes(nearestEvent.eventName)) {
          outcome = "kept";
        }
      }

      return {
        ...survey,
        outcome,
      };
    });

    return NextResponse.json({
      surveys: surveysWithOutcome,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching cancellation surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}
