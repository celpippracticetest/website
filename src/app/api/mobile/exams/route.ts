import mongoClient from "@/lib/mongodb";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { ExamRepository } from "@/repositories/exams.repo";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Learner-facing exam list for native apps (stable JSON for KMP client).
 * Shape matches `ExamsPageResponse` in `celpip-native/shared`.
 */
export async function GET(request: NextRequest) {
  const authContext = await getAuthenticatedRequestContext(request);
  if (!authContext?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Math.max(0, parseInt(request.nextUrl.searchParams.get("page") ?? "0", 10) || 0);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10) || 50)
  );

  const examRepo = new ExamRepository(mongoClient);
  const exams = await examRepo.getAllExam({}, page, limit);

  const items = exams.items.map((e) => ({
    id: e.id,
    name: e.name,
    order: e.order,
    isReady: e.isReady,
  }));

  return NextResponse.json({
    items,
    total: exams.totalItems,
    page,
    limit,
  });
}
