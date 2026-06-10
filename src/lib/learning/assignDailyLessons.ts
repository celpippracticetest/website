import {
  createAssignment,
  getActiveAssignment,
  getLatestCompletedAssignment,
} from "@/repositories/learningAssignments.repo";
import { getLearningProfile } from "@/repositories/learningProfile.repo";
import { findPoolContent } from "@/repositories/learningContentPool.repo";
import { canAccessLearningSequence } from "@/lib/learning/access";
import { getTodayInTimezone, isTodayInTimezone } from "@/lib/learning/dates";
import { getOrCreatePoolLesson } from "@/lib/learning/generateLessonContent";
import { formatAssignLessonError } from "@/lib/learning/lessonErrors";
import {
  LEARNING_SKILLS,
  skillToKey,
  type LearningSkill,
  type SkillLessonPayload,
  type UserLearningProfile,
} from "@/lib/learning/types";

async function resolveSkillLesson(
  userId: string,
  profile: UserLearningProfile,
  skill: LearningSkill,
  dayOffset = 0,
  hasSubscription = false
): Promise<SkillLessonPayload> {
  const timezone = profile.timezone;
  const today = getTodayInTimezone(timezone, dayOffset);
  const currentClb = profile.currentClb[skillToKey(skill)];
  const targetClb = profile.targetClb[skillToKey(skill)];

  const active = await getActiveAssignment(userId, skill);
  if (active) {
    try {
      const pool = await findPoolContent(
        skill,
        currentClb,
        targetClb,
        active.sequenceNumber
      );
      if (!pool) {
        return {
          skill,
          state: "error",
          error: "Lesson content unavailable. Please try again.",
        };
      }
      return {
        skill,
        state: "active",
        assignmentId: active.id,
        sequenceNumber: active.sequenceNumber,
        lessonDate: active.lessonDate,
        content: pool.content,
      };
    } catch (err) {
      console.error(`Failed to load ${skill} pool content for ${userId}:`, err);
      return {
        skill,
        state: "error",
        error: formatAssignLessonError(err),
      };
    }
  }

  const latestCompleted = await getLatestCompletedAssignment(userId, skill);

  if (
    latestCompleted?.completedAt &&
    isTodayInTimezone(latestCompleted.completedAt, timezone, dayOffset)
  ) {
    const pool = await findPoolContent(
      skill,
      currentClb,
      targetClb,
      latestCompleted.sequenceNumber
    );
    return {
      skill,
      state: "completed_today",
      assignmentId: latestCompleted.id,
      sequenceNumber: latestCompleted.sequenceNumber,
      lessonDate: latestCompleted.lessonDate,
      content: pool?.content,
    };
  }

  const nextSequence = latestCompleted
    ? latestCompleted.sequenceNumber + 1
    : 1;

  if (!canAccessLearningSequence(nextSequence, hasSubscription)) {
    return {
      skill,
      state: "subscription_required",
      sequenceNumber: nextSequence,
    };
  }

  try {
    const { poolId, content } = await getOrCreatePoolLesson({
      skill,
      currentClb,
      targetClb,
      sequenceNumber: nextSequence,
    });

    const assignment = await createAssignment({
      userId,
      skill,
      contentPoolId: poolId,
      sequenceNumber: nextSequence,
      lessonDate: today,
    });

    return {
      skill,
      state: "active",
      assignmentId: assignment.id,
      sequenceNumber: nextSequence,
      lessonDate: today,
      content,
    };
  } catch (err) {
    console.error(`Failed to assign ${skill} lesson for ${userId}:`, err);
    return {
      skill,
      state: "error",
      error: formatAssignLessonError(err),
    };
  }
}

export type DailyLearningResult = {
  profile: UserLearningProfile;
  lessons: SkillLessonPayload[];
  hasPendingLessons: boolean;
  hasSubscription: boolean;
  requiresSubscription: boolean;
  today: string;
};

export async function assignDailyLessons(
  userId: string,
  options?: { dayOffset?: number; hasSubscription?: boolean }
): Promise<DailyLearningResult | null> {
  const profile = await getLearningProfile(userId);
  if (!profile) return null;

  const dayOffset = options?.dayOffset ?? 0;
  const hasSubscription = options?.hasSubscription ?? false;

  const lessons = await Promise.all(
    LEARNING_SKILLS.map((skill) =>
      resolveSkillLesson(userId, profile, skill, dayOffset, hasSubscription)
    )
  );

  const hasPendingLessons = lessons.some((l) => l.state === "active");
  const requiresSubscription = lessons.some(
    (l) => l.state === "subscription_required"
  );

  return {
    profile,
    lessons,
    hasPendingLessons,
    hasSubscription,
    requiresSubscription,
    today: getTodayInTimezone(profile.timezone, dayOffset),
  };
}

export async function resetSkillAssignmentsAfterProfileChange(
  userId: string
): Promise<void> {
  const { deleteActiveAssignmentsForUser } = await import(
    "@/repositories/learningAssignments.repo"
  );
  await deleteActiveAssignmentsForUser(userId);
}
