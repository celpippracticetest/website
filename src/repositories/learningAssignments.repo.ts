import { getSql } from "@/lib/pg/pool";
import type { LearningReminderLessonPreview } from "@/lib/learning/reminder-email";
import {
  AssignmentStatus,
  LearningSkill,
  UserLearningAssignment,
} from "@/lib/learning/types";

type AssignmentRow = {
  id: string;
  user_id: string;
  skill: string;
  content_pool_id: string;
  sequence_number: number;
  lesson_date: Date;
  status: string;
  completed_at: Date | null;
  created_at: Date;
};

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapAssignment(row: AssignmentRow): UserLearningAssignment {
  return {
    id: row.id,
    userId: row.user_id,
    skill: row.skill as LearningSkill,
    contentPoolId: row.content_pool_id,
    sequenceNumber: row.sequence_number,
    lessonDate:
      row.lesson_date instanceof Date
        ? formatDate(row.lesson_date)
        : String(row.lesson_date).slice(0, 10),
    status: row.status as AssignmentStatus,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function getActiveAssignment(
  userId: string,
  skill: LearningSkill
): Promise<UserLearningAssignment | null> {
  const sql = getSql();
  const rows = await sql<AssignmentRow[]>`
    SELECT id, user_id, skill, content_pool_id, sequence_number, lesson_date, status, completed_at, created_at
    FROM public.user_learning_assignments
    WHERE user_id = ${userId} AND skill = ${skill} AND status = 'active'
    LIMIT 1
  `;
  const row = rows[0];
  return row ? mapAssignment(row) : null;
}

export async function getActiveAssignmentsForUser(
  userId: string
): Promise<UserLearningAssignment[]> {
  const sql = getSql();
  const rows = await sql<AssignmentRow[]>`
    SELECT id, user_id, skill, content_pool_id, sequence_number, lesson_date, status, completed_at, created_at
    FROM public.user_learning_assignments
    WHERE user_id = ${userId} AND status = 'active'
    ORDER BY skill
  `;
  return rows.map(mapAssignment);
}

export async function getLatestCompletedAssignment(
  userId: string,
  skill: LearningSkill
): Promise<UserLearningAssignment | null> {
  const sql = getSql();
  const rows = await sql<AssignmentRow[]>`
    SELECT id, user_id, skill, content_pool_id, sequence_number, lesson_date, status, completed_at, created_at
    FROM public.user_learning_assignments
    WHERE user_id = ${userId} AND skill = ${skill} AND status = 'completed'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 1
  `;
  const row = rows[0];
  return row ? mapAssignment(row) : null;
}

export async function createAssignment(input: {
  userId: string;
  skill: LearningSkill;
  contentPoolId: string;
  sequenceNumber: number;
  lessonDate: string;
}): Promise<UserLearningAssignment> {
  const sql = getSql();
  const rows = await sql<AssignmentRow[]>`
    INSERT INTO public.user_learning_assignments (
      user_id, skill, content_pool_id, sequence_number, lesson_date, status
    ) VALUES (
      ${input.userId},
      ${input.skill},
      ${input.contentPoolId},
      ${input.sequenceNumber},
      ${input.lessonDate}::date,
      'active'
    )
    RETURNING id, user_id, skill, content_pool_id, sequence_number, lesson_date, status, completed_at, created_at
  `;
  return mapAssignment(rows[0]!);
}

export async function completeAssignment(
  assignmentId: string,
  userId: string
): Promise<UserLearningAssignment | null> {
  const sql = getSql();
  const now = new Date();
  const rows = await sql<AssignmentRow[]>`
    UPDATE public.user_learning_assignments
    SET status = 'completed', completed_at = ${now}
    WHERE id = ${assignmentId}::uuid
      AND user_id = ${userId}
      AND status = 'active'
    RETURNING id, user_id, skill, content_pool_id, sequence_number, lesson_date, status, completed_at, created_at
  `;
  const row = rows[0];
  return row ? mapAssignment(row) : null;
}

export async function deleteActiveAssignmentsForUser(userId: string): Promise<void> {
  const sql = getSql();
  await sql`
    DELETE FROM public.user_learning_assignments
    WHERE user_id = ${userId} AND status = 'active'
  `;
}

export async function countPendingAssignments(userId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM public.user_learning_assignments
    WHERE user_id = ${userId} AND status = 'active'
  `;
  return rows[0]?.count ?? 0;
}

export type LearningReminderCandidate = {
  userId: string;
  email: string;
  firstName: string | null;
  pendingSkills: string[];
  pendingCount: number;
  pendingLessons: LearningReminderLessonPreview[];
};

export async function listLearningReminderCandidates(
  limit: number = 200
): Promise<LearningReminderCandidate[]> {
  const sql = getSql();
  const rows = await sql<
    {
      user_id: string;
      email: string;
      first_name: string | null;
      pending_skills: string[];
      pending_count: number;
      pending_lessons: LearningReminderLessonPreview[] | null;
    }[]
  >`
    SELECT
      p.user_id,
      COALESCE(up.email, '') AS email,
      NULLIF(trim(up.public_metadata->>'firstName'), '') AS first_name,
      array_agg(DISTINCT a.skill ORDER BY a.skill) AS pending_skills,
      COUNT(a.id)::int AS pending_count,
      json_agg(
        json_build_object(
          'skill', a.skill,
          'title', c.content->>'title',
          'focusArea', c.content->>'focusArea',
          'linguisticKey', c.content->>'linguisticKey'
        ) ORDER BY a.skill
      ) AS pending_lessons
    FROM public.user_learning_profiles p
    INNER JOIN public.user_learning_assignments a
      ON a.user_id = p.user_id AND a.status = 'active'
    INNER JOIN public.learning_content_pool c
      ON c.id = a.content_pool_id
    LEFT JOIN public.user_profiles up ON up.user_id = p.user_id
    WHERE COALESCE(up.email, '') <> ''
    GROUP BY p.user_id, up.email, up.public_metadata->>'firstName'
    HAVING COUNT(a.id) > 0
    ORDER BY MIN(a.lesson_date) ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    firstName: row.first_name,
    pendingSkills: row.pending_skills ?? [],
    pendingCount: row.pending_count,
    pendingLessons: row.pending_lessons ?? [],
  }));
}
