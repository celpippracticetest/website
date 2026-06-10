import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { countPendingAssignments } from "@/repositories/learningAssignments.repo";
import { getLearningProfile } from "@/repositories/learningProfile.repo";

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedRequestContext(req);
  if (!ctx?.user) {
    return NextResponse.json({ hasPendingLessons: false, pendingCount: 0 });
  }

  const profile = await getLearningProfile(ctx.user.id);
  if (!profile) {
    return NextResponse.json({ configured: false, hasPendingLessons: false, pendingCount: 0 });
  }

  const pendingCount = await countPendingAssignments(ctx.user.id);
  return NextResponse.json({
    configured: true,
    hasPendingLessons: pendingCount > 0,
    pendingCount,
  });
}
