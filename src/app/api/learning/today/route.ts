import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { hasLearningSubscription } from "@/lib/learning/access";
import { assignDailyLessons } from "@/lib/learning/assignDailyLessons";
import { parseLearningDayOffset } from "@/lib/learning/dates";
import { startLearningTimer } from "@/lib/learning/learningTimingLog";
import { touchLearningEngaged } from "@/repositories/learningReminders.repo";

export async function GET(req: NextRequest) {
  const endRequest = startLearningTimer("GET /api/learning/today", {
    defer: req.nextUrl.searchParams.get("defer") === "1",
    generateOne: req.nextUrl.searchParams.get("generate") === "1",
    dayOffset: req.nextUrl.searchParams.get("d"),
  });

  try {
    const endAuth = startLearningTimer("GET /api/learning/today.auth");
    const ctx = await getAuthenticatedRequestContext(req);
    endAuth({ authenticated: Boolean(ctx?.user) });
    if (!ctx?.user) {
      endRequest({ status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dayOffset = parseLearningDayOffset(req.nextUrl.searchParams.get("d"));
    const hasSubscription = hasLearningSubscription(ctx.user);
    const deferGeneration = req.nextUrl.searchParams.get("defer") === "1";
    const generateOne = req.nextUrl.searchParams.get("generate") === "1";
    const result = await assignDailyLessons(ctx.user.id, {
      dayOffset,
      hasSubscription,
      deferGeneration,
      generateOne,
    });
    if (!result) {
      endRequest({ status: 200, configured: false });
      return NextResponse.json({ configured: false, hasPendingLessons: false });
    }

    void touchLearningEngaged(ctx.user.id).catch(() => {});

    endRequest({
      status: 200,
      configured: true,
      lessonStates: Object.fromEntries(
        result.lessons.map((lesson) => [lesson.skill, lesson.state])
      ),
    });

    return NextResponse.json({
      configured: true,
      today: result.today,
      hasPendingLessons: result.hasPendingLessons,
      hasSubscription: result.hasSubscription,
      requiresSubscription: result.requiresSubscription,
      currentClb: result.profile.currentClb,
      targetClb: result.profile.targetClb,
      timezone: result.profile.timezone,
      lessons: result.lessons,
    });
  } catch (err) {
    console.error("[learning/today]", err);
    endRequest({
      status: 500,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load today's lessons",
      },
      { status: 500 }
    );
  }
}
