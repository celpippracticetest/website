import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { getLearningProfile, upsertLearningProfile } from "@/repositories/learningProfile.repo";
import { ClbScoresSchema } from "@/lib/learning/types";

function validateClbPair(
  current: Record<string, number>,
  target: Record<string, number>
): string | null {
  const skills = ["listening", "reading", "writing", "speaking"] as const;
  let activeSkillCount = 0;

  for (const skill of skills) {
    const c = current[skill];
    const t = target[skill];
    if (typeof c !== "number" || typeof t !== "number") {
      return `Missing CLB level for ${skill}`;
    }
    if (c === 12) {
      if (t !== 12) {
        return `At CLB 12 for ${skill}, target must be 12`;
      }
      continue;
    }
    if (t === c) {
      continue;
    }
    if (t < c + 1) {
      return `Target CLB for ${skill} must match current (skip) or be at least one level above (${c + 1}+)`;
    }
    activeSkillCount += 1;
  }

  if (activeSkillCount === 0) {
    return "Choose at least one skill for daily practice.";
  }

  return null;
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedRequestContext(req);
  if (!ctx?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getLearningProfile(ctx.user.id);
  if (!profile) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    currentClb: profile.currentClb,
    targetClb: profile.targetClb,
    timezone: profile.timezone,
    updatedAt: profile.updatedAt.toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthenticatedRequestContext(req);
  if (!ctx?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = body as {
    currentClb?: unknown;
    targetClb?: unknown;
    timezone?: unknown;
  };

  const currentResult = ClbScoresSchema.safeParse(parsed.currentClb);
  const targetResult = ClbScoresSchema.safeParse(parsed.targetClb);

  if (!currentResult.success || !targetResult.success) {
    return NextResponse.json(
      { error: "Invalid CLB scores. Each skill must be an integer 4–12." },
      { status: 400 }
    );
  }

  const pairError = validateClbPair(
    currentResult.data,
    targetResult.data
  );
  if (pairError) {
    return NextResponse.json({ error: pairError }, { status: 400 });
  }

  const timezone =
    typeof parsed.timezone === "string" && parsed.timezone.trim()
      ? parsed.timezone.trim()
      : "America/Toronto";

  const existing = await getLearningProfile(ctx.user.id);
  const profileChanged =
    existing &&
    (JSON.stringify(existing.currentClb) !== JSON.stringify(currentResult.data) ||
      JSON.stringify(existing.targetClb) !== JSON.stringify(targetResult.data));

  const profile = await upsertLearningProfile(
    ctx.user.id,
    currentResult.data,
    targetResult.data,
    timezone
  );

  if (profileChanged) {
    const { resetSkillAssignmentsAfterProfileChange } = await import(
      "@/lib/learning/assignDailyLessons"
    );
    await resetSkillAssignmentsAfterProfileChange(ctx.user.id);
  }

  return NextResponse.json({
    configured: true,
    currentClb: profile.currentClb,
    targetClb: profile.targetClb,
    timezone: profile.timezone,
    updatedAt: profile.updatedAt.toISOString(),
    profileReset: Boolean(profileChanged),
  });
}
