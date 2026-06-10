import { getSql } from "@/lib/pg/pool";
import {
  ClbScores,
  ClbScoresSchema,
  UserLearningProfile,
} from "@/lib/learning/types";

type ProfileRow = {
  user_id: string;
  current_clb: unknown;
  target_clb: unknown;
  timezone: string;
  created_at: Date;
  updated_at: Date;
};

function mapProfile(row: ProfileRow): UserLearningProfile {
  return {
    userId: row.user_id,
    currentClb: ClbScoresSchema.parse(row.current_clb),
    targetClb: ClbScoresSchema.parse(row.target_clb),
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLearningProfile(
  userId: string
): Promise<UserLearningProfile | null> {
  const sql = getSql();
  const rows = await sql<ProfileRow[]>`
    SELECT user_id, current_clb, target_clb, timezone, created_at, updated_at
    FROM public.user_learning_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? mapProfile(row) : null;
}

export async function upsertLearningProfile(
  userId: string,
  currentClb: ClbScores,
  targetClb: ClbScores,
  timezone: string = "America/Toronto"
): Promise<UserLearningProfile> {
  const sql = getSql();
  const now = new Date();
  const rows = await sql<ProfileRow[]>`
    INSERT INTO public.user_learning_profiles (
      user_id, current_clb, target_clb, timezone, created_at, updated_at
    ) VALUES (
      ${userId},
      ${sql.json(currentClb as Record<string, number>)},
      ${sql.json(targetClb as Record<string, number>)},
      ${timezone},
      ${now},
      ${now}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      current_clb = EXCLUDED.current_clb,
      target_clb = EXCLUDED.target_clb,
      timezone = EXCLUDED.timezone,
      updated_at = EXCLUDED.updated_at
    RETURNING user_id, current_clb, target_clb, timezone, created_at, updated_at
  `;
  return mapProfile(rows[0]!);
}
