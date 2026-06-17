import * as XLSX from "xlsx";
import documentsClient from "@/lib/appDocumentsClient";
import { OnboardingNewRepository } from "@/repositories/onboardingNew.repo";
import { NextResponse } from "next/server";
import { appUserAdmin, currentUser } from "@/lib/auth/server-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const existing = (user.privateMetadata?.onboardingNew as Record<string, unknown>) || {};
  const meta: Record<string, unknown> = { ...existing };
  if (data.action === "askLater") {
    meta.askedLaterAt = new Date().toISOString();
  } else if (data.action === "submit") {
    meta.completed = true;
    meta.answers = { ...data.answers, answeredAt: new Date().toISOString() };
    await new OnboardingNewRepository(documentsClient).createOrUpdateOnboardingNewResult({
      userId: user.id,
      answers: data.answers,
      answeredAt: new Date(),
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  await (await appUserAdmin()).users.updateUserMetadata(user.id, {
    privateMetadata: { ...user.privateMetadata, onboardingNew: meta },
    publicMetadata: user.publicMetadata,
  });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const repo = new OnboardingNewRepository(documentsClient);
    const results = await repo.getOnboardingNewResultsPaginated(page, limit);
    const totalCount = await repo.getOnboardingNewResultsCount();
    const allResults = await repo.getAllOnboardingNewResults();
    const stats = {
      testDates: allResults.filter((i) => i.answers?.testDate).length,
      focusSkills: allResults.filter((i) => i.answers?.focusSkill).length,
      customFocusSkills: allResults.filter((i) => i.answers?.customFocusSkill).length,
      averageTargetScore: allResults.length
        ? Math.round((allResults.reduce((sum, item) => {
            const s = item.answers?.targetScores || {};
            return sum + (s.listening || 0) + (s.reading || 0) + (s.writing || 0) + (s.speaking || 0);
          }, 0) / (allResults.length * 4)) * 10) / 10
        : 0,
    };
    const data = await Promise.all(results.map(async (result) => {
      let name = "";
      try {
        const u = await (await appUserAdmin()).users.getUser(result.userId);
        name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      } catch { /* noop */ }
      return { ...result, name };
    }));
    return NextResponse.json({
      data,
      pagination: { page, limit, total: totalCount, totalPages: Math.ceil(totalCount / limit) },
      statistics: stats,
    });
  } catch (err) {
    console.error("Error fetching onboarding new data:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
