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
  startLearningTimer,
  summarizeLessonStates,
} from "@/lib/learning/learningTimingLog";
import {
  isSkillPracticeSkipped,
  LEARNING_SKILLS,
  skillToKey,
  type LearningSkill,
  type SkillLessonPayload,
  type UserLearningProfile,
} from "@/lib/learning/types";

type ResolveSkillLessonOptions = {
  allowGeneration?: boolean;
};

async function resolveSkillLesson(
  userId: string,
  profile: UserLearningProfile,
  skill: LearningSkill,
  dayOffset = 0,
  hasSubscription = false,
  options: ResolveSkillLessonOptions = {}
): Promise<SkillLessonPayload> {
  const allowGeneration = options.allowGeneration ?? true;
  const endSkillTimer = startLearningTimer("resolveSkillLesson", {
    skill,
    allowGeneration,
    dayOffset,
  });
  const timezone = profile.timezone;
  const today = getTodayInTimezone(timezone, dayOffset);
  const currentClb = profile.currentClb[skillToKey(skill)];
  const targetClb = profile.targetClb[skillToKey(skill)];

  if (isSkillPracticeSkipped(currentClb, targetClb)) {
    endSkillTimer({ branch: "skipped" });
    return { skill, state: "skipped" };
  }

  const endActiveLookup = startLearningTimer("resolveSkillLesson.activeAssignment", {
    skill,
  });
  const active = await getActiveAssignment(userId, skill);
  endActiveLookup({ found: Boolean(active) });
  if (active) {
    try {
      const endPoolLookup = startLearningTimer("resolveSkillLesson.poolLookup", {
        skill,
        sequenceNumber: active.sequenceNumber,
        source: "activeAssignment",
      });
      const pool = await findPoolContent(
        skill,
        currentClb,
        targetClb,
        active.sequenceNumber
      );
      endPoolLookup({ hit: Boolean(pool) });
      if (!pool) {
        endSkillTimer({ branch: "error", reason: "missing_pool_for_active_assignment" });
        return {
          skill,
          state: "error",
          error: "Lesson content unavailable. Please try again.",
        };
      }
      endSkillTimer({
        branch: "active",
        assignmentId: active.id,
        sequenceNumber: active.sequenceNumber,
      });
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
      endSkillTimer({ branch: "error", reason: "pool_lookup_failed" });
      return {
        skill,
        state: "error",
        error: formatAssignLessonError(err),
      };
    }
  }

  const endCompletedLookup = startLearningTimer(
    "resolveSkillLesson.latestCompleted",
    { skill }
  );
  const latestCompleted = await getLatestCompletedAssignment(userId, skill);
  endCompletedLookup({ found: Boolean(latestCompleted) });

  if (
    latestCompleted?.completedAt &&
    isTodayInTimezone(latestCompleted.completedAt, timezone, dayOffset)
  ) {
    const endPoolLookup = startLearningTimer("resolveSkillLesson.poolLookup", {
      skill,
      sequenceNumber: latestCompleted.sequenceNumber,
      source: "completedToday",
    });
    const pool = await findPoolContent(
      skill,
      currentClb,
      targetClb,
      latestCompleted.sequenceNumber
    );
    endPoolLookup({ hit: Boolean(pool) });
    endSkillTimer({
      branch: "completed_today",
      assignmentId: latestCompleted.id,
      sequenceNumber: latestCompleted.sequenceNumber,
    });
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
    endSkillTimer({ branch: "subscription_required", sequenceNumber: nextSequence });
    return {
      skill,
      state: "subscription_required",
      sequenceNumber: nextSequence,
    };
  }

  if (!allowGeneration) {
    endSkillTimer({ branch: "loading_deferred", sequenceNumber: nextSequence });
    return {
      skill,
      state: "loading",
      sequenceNumber: nextSequence,
    };
  }

  try {
    const endGenerate = startLearningTimer("resolveSkillLesson.generateLesson", {
      skill,
      sequenceNumber: nextSequence,
      currentClb,
      targetClb,
    });
    const { poolId, content } = await getOrCreatePoolLesson({
      skill,
      currentClb,
      targetClb,
      sequenceNumber: nextSequence,
    });
    endGenerate({ poolId });

    const endCreateAssignment = startLearningTimer(
      "resolveSkillLesson.createAssignment",
      { skill, sequenceNumber: nextSequence }
    );
    const assignment = await createAssignment({
      userId,
      skill,
      contentPoolId: poolId,
      sequenceNumber: nextSequence,
      lessonDate: today,
    });
    endCreateAssignment({ assignmentId: assignment.id });

    endSkillTimer({
      branch: "generated_active",
      assignmentId: assignment.id,
      sequenceNumber: nextSequence,
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
    endSkillTimer({
      branch: "error",
      reason: "generate_or_assign_failed",
      sequenceNumber: nextSequence,
    });
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
  options?: {
    dayOffset?: number;
    hasSubscription?: boolean;
    deferGeneration?: boolean;
    generateOne?: boolean;
  }
): Promise<DailyLearningResult | null> {
  const endAssign = startLearningTimer("assignDailyLessons", {
    userId,
    deferGeneration: options?.deferGeneration ?? false,
    generateOne: options?.generateOne ?? false,
    dayOffset: options?.dayOffset ?? 0,
  });

  const endProfileLookup = startLearningTimer("assignDailyLessons.profile");
  const profile = await getLearningProfile(userId);
  endProfileLookup({ found: Boolean(profile) });
  if (!profile) {
    endAssign({ configured: false });
    return null;
  }

  const dayOffset = options?.dayOffset ?? 0;
  const hasSubscription = options?.hasSubscription ?? false;
  const deferGeneration = options?.deferGeneration ?? false;
  const generateOne = options?.generateOne ?? false;

  let skillToGenerate: LearningSkill | null = null;
  if (generateOne && !deferGeneration) {
    const endPreview = startLearningTimer("assignDailyLessons.previewPass");
    for (const skill of LEARNING_SKILLS) {
      const preview = await resolveSkillLesson(
        userId,
        profile,
        skill,
        dayOffset,
        hasSubscription,
        { allowGeneration: false }
      );
      if (preview.state === "loading") {
        skillToGenerate = skill;
        break;
      }
    }
    endPreview({ skillToGenerate });
  }

  const endResolveAll = startLearningTimer("assignDailyLessons.resolveAll", {
    skillToGenerate,
    deferGeneration,
    generateOne,
  });
  const lessons = await Promise.all(
    LEARNING_SKILLS.map((skill) =>
      resolveSkillLesson(userId, profile, skill, dayOffset, hasSubscription, {
        allowGeneration: deferGeneration
          ? false
          : generateOne
            ? skill === skillToGenerate
            : true,
      })
    )
  );
  endResolveAll({ states: summarizeLessonStates(lessons) });

  const hasPendingLessons = lessons.some((l) => l.state === "active");
  const requiresSubscription = lessons.some(
    (l) => l.state === "subscription_required"
  );

  endAssign({
    configured: true,
    states: summarizeLessonStates(lessons),
    hasPendingLessons,
    requiresSubscription,
  });

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
