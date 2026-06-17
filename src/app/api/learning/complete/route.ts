import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import { completeAssignment } from "@/repositories/learningAssignments.repo";
import { touchLearningEngaged } from "@/repositories/learningReminders.repo";
import { LEARNING_SKILLS, type LearningSkill } from "@/lib/learning/types";
import { startLearningTimer } from "@/lib/learning/learningTimingLog";
import client from "@/lib/appDocumentsClient";

function isLearningSkill(value: string): value is LearningSkill {
  return (LEARNING_SKILLS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  const endRequest = startLearningTimer("POST /api/learning/complete");
  const ctx = await getAuthenticatedRequestContext(req);
  if (!ctx?.user) {
    endRequest({ status: 401 });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const skillRaw = (body as { skill?: string }).skill?.toUpperCase().trim();
  if (!skillRaw || !isLearningSkill(skillRaw)) {
    return NextResponse.json(
      { error: "Invalid skill. Use LISTENING, READING, WRITING, or SPEAKING." },
      { status: 400 }
    );
  }

  const assignmentId = (body as { assignmentId?: string }).assignmentId?.trim();
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const endComplete = startLearningTimer("POST /api/learning/complete.completeAssignment", {
    skill: skillRaw,
    assignmentId,
  });
  const completed = await completeAssignment(assignmentId, ctx.user.id);
  endComplete({ found: Boolean(completed) });
  if (!completed) {
    endRequest({ status: 404, skill: skillRaw });
    return NextResponse.json(
      { error: "Assignment not found or already completed" },
      { status: 404 }
    );
  }

  if (completed.skill !== skillRaw) {
    endRequest({ status: 400, skill: skillRaw, reason: "skill_mismatch" });
    return NextResponse.json({ error: "Skill mismatch" }, { status: 400 });
  }

  void touchLearningEngaged(ctx.user.id).catch(() => {});

  try {
    const db = client.db();
    void db.collection("user_activities").insertOne({
      userId: ctx.user.id,
      eventType: "learning_attempt_completed",
      context: "learning",
      skill: skillRaw.charAt(0) + skillRaw.slice(1).toLowerCase(),
      status: "completed",
      contentId: assignmentId,
      notes: `Daily learning lesson #${completed.sequenceNumber} completed`,
      metadata: {
        sequenceNumber: completed.sequenceNumber,
        lessonDate: completed.lessonDate,
      },
      occurredAt: new Date(),
      createdAt: new Date(),
    }).catch((err) => {
      console.error("Failed to log learning completion activity:", err);
    });
  } catch (err) {
    console.error("Failed to log learning completion activity:", err);
  }

  endRequest({
    status: 200,
    skill: completed.skill,
    sequenceNumber: completed.sequenceNumber,
  });

  return NextResponse.json({
    ok: true,
    skill: completed.skill,
    sequenceNumber: completed.sequenceNumber,
    completedAt: completed.completedAt?.toISOString(),
  });
}
