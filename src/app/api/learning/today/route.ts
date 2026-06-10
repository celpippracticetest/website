import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { hasLearningSubscription } from "@/lib/learning/access";
import { assignDailyLessons } from "@/lib/learning/assignDailyLessons";
import { parseLearningDayOffset } from "@/lib/learning/dates";
import { touchLearningEngaged } from "@/repositories/learningReminders.repo";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedRequestContext(req);
    if (!ctx?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dayOffset = parseLearningDayOffset(req.nextUrl.searchParams.get("d"));
    const hasSubscription = hasLearningSubscription(ctx.user);
    const result = await assignDailyLessons(ctx.user.id, {
      dayOffset,
      hasSubscription,
    });
    if (!result) {
      return NextResponse.json({ configured: false, hasPendingLessons: false });
    }

    void touchLearningEngaged(ctx.user.id).catch(() => {});

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
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load today's lessons",
      },
      { status: 500 }
    );
  }
}
