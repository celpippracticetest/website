import { NextResponse } from "next/server";
import documentsClient from "@/lib/appDocumentsClient";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { ensureCmsAdmin } from "@/lib/cms/ensure-admin";
import { readinessLabel } from "@/lib/nps";
import { NpsRepository, type TNpsResponse } from "@/repositories/nps.repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scoreBucket(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

function buildStatistics(responses: TNpsResponse[]) {
  const total = responses.length;
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let scoreSum = 0;
  const scoreDistribution: Record<string, number> = {};
  const readinessDistribution: Record<string, number> = {};
  const triggerDistribution: Record<string, number> = {
    mock_leave: 0,
    practice_milestone: 0,
  };

  for (let i = 0; i <= 10; i++) scoreDistribution[String(i)] = 0;

  for (const row of responses) {
    scoreSum += row.score;
    scoreDistribution[String(row.score)] =
      (scoreDistribution[String(row.score)] || 0) + 1;

    const bucket = scoreBucket(row.score);
    if (bucket === "promoter") promoters += 1;
    else if (bucket === "passive") passives += 1;
    else detractors += 1;

    triggerDistribution[row.trigger] =
      (triggerDistribution[row.trigger] || 0) + 1;

    if (row.readiness) {
      const label = readinessLabel(row.readiness);
      readinessDistribution[label] = (readinessDistribution[label] || 0) + 1;
    }
  }

  const npsScore =
    total === 0
      ? 0
      : Math.round(((promoters - detractors) / total) * 1000) / 10;

  return {
    total,
    averageScore:
      total === 0 ? 0 : Math.round((scoreSum / total) * 10) / 10,
    npsScore,
    promoters,
    passives,
    detractors,
    scoreDistribution,
    readinessDistribution,
    triggerDistribution,
  };
}

function serializeId(id: unknown): string {
  if (id == null) return "";
  if (typeof id === "string") return id;
  if (typeof id === "object" && id !== null && "toHexString" in id) {
    try {
      return String((id as { toHexString: () => string }).toHexString());
    } catch {
      /* fall through */
    }
  }
  return String(id);
}

export async function GET(req: Request) {
  const gate = await ensureCmsAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50),
    );
    const triggerRaw = (searchParams.get("trigger") || "all").toLowerCase();
    const trigger =
      triggerRaw === "mock_leave" || triggerRaw === "practice_milestone"
        ? triggerRaw
        : undefined;

    const repo = new NpsRepository(documentsClient);
    const filter = trigger ? { trigger } : {};
    const [rows, total, allForStats] = await Promise.all([
      repo.getAllPaginated(page, limit, filter),
      repo.count(filter),
      repo.getAll(filter),
    ]);

    const authAdmin = await appUserAdmin();
    const data = await Promise.all(
      rows.map(async (row) => {
        let name = "";
        let email = "";
        try {
          const user = await authAdmin.users.getUser(row.userId);
          name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
          email =
            user.primaryEmailAddress?.emailAddress ||
            user.emailAddresses?.[0]?.emailAddress ||
            "";
        } catch {
          /* user may have been deleted */
        }

        const { _id, ...rest } = row;
        return {
          id: serializeId(_id),
          ...rest,
          name,
          email,
          createdAt:
            rest.createdAt instanceof Date
              ? rest.createdAt.toISOString()
              : rest.createdAt,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      statistics: buildStatistics(allForStats),
    });
  } catch (error) {
    console.error("Admin NPS responses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
