import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { getDb } from "@/lib/appDocumentsClient";
import { buildMicrolearningFlow, FlowSkill } from "@/lib/flow";
import { matchUsersCollectionByWebUserIds } from "@/lib/users/userDocumentIdentity";

type TargetScores = {
  listening?: number;
  reading?: number;
  writing?: number;
  speaking?: number;
};

function normalizeTargetScore(
  onboardingTargetScore: unknown,
  intentTargetScore: unknown,
  targetScores: TargetScores | null
): number | null {
  if (typeof onboardingTargetScore === "number" && Number.isFinite(onboardingTargetScore)) {
    return onboardingTargetScore;
  }

  if (typeof intentTargetScore === "number" && Number.isFinite(intentTargetScore)) {
    return intentTargetScore;
  }

  if (!targetScores) return null;

  const values = [
    targetScores.listening,
    targetScores.reading,
    targetScores.writing,
    targetScores.speaking,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length) return null;
  return Math.round((values.reduce((acc, value) => acc + value, 0) / values.length) * 10) / 10;
}

function categoryFromSkill(skill: FlowSkill): "listening" | "reading" | "writing" | "speaking" {
  return skill;
}

async function buildPracticeActionUrl(skill: FlowSkill): Promise<string> {
  const category = categoryFromSkill(skill);
  const db = await getDb();
  const hasAnyTask = await db
    .collection("tasks")
    .countDocuments({ type: "practice", category });

  if (!hasAnyTask) return "/practice-overview";
  return `/${category}`;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthenticatedRequestContext(req);
    if (!ctx?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = ctx.user;

    const db = await getDb();
    const userDoc = await db.collection("users").findOne(
      matchUsersCollectionByWebUserIds(user.id, ctx.supabaseAuthUserId ?? ""),
    );

    const onboarding = (userDoc?.onboarding as Record<string, unknown> | undefined) || {};
    const intent = (userDoc?.intent as Record<string, unknown> | undefined) || {};

    const focusSkill =
      typeof onboarding.customFocusSkill === "string" && onboarding.customFocusSkill.trim()
        ? onboarding.customFocusSkill
        : onboarding.focusSkill;

    const subGoal =
      typeof onboarding.customSubGoal === "string" && onboarding.customSubGoal.trim()
        ? onboarding.customSubGoal
        : onboarding.subGoal;

    const targetScore = normalizeTargetScore(
      onboarding.targetScore,
      intent.targetScore,
      (onboarding.targetScores as TargetScores | undefined) || null
    );

    const flow = buildMicrolearningFlow({
      subGoal: typeof subGoal === "string" ? subGoal : null,
      targetScore,
      focusSkill: typeof focusSkill === "string" ? focusSkill : null,
      testDate: typeof onboarding.testDate === "string" ? onboarding.testDate : null,
    });

    const learningUrl = "/learning";
    const practiceUrl = await buildPracticeActionUrl(flow.focusSkill);
    const firstAction = flow.firstActionType === "practice" ? practiceUrl : learningUrl;

    const steps = flow.steps.map((step) => {
      if (step.kind === "learning") return { ...step, actionHref: learningUrl };
      if (step.kind === "practice") return { ...step, actionHref: practiceUrl };
      return { ...step, actionHref: "/practice-overview" };
    });

    return NextResponse.json({
      flow: {
        ...flow,
        steps,
      },
      firstAction,
      profile: {
        subGoal: flow.subGoal,
        targetScore: flow.targetScore,
        focusSkill:
          (typeof focusSkill === "string" && focusSkill) ||
          flow.focusSkill.charAt(0).toUpperCase() + flow.focusSkill.slice(1),
        testDate:
          typeof onboarding.testDate === "string" ? onboarding.testDate : null,
      },
    });
  } catch (error) {
    console.error("Error generating microlearning flow:", error);
    return NextResponse.json(
      {
        flow: null,
        firstAction: "/practice-overview",
        error: "Failed to generate flow",
      },
      { status: 500 }
    );
  }
}
