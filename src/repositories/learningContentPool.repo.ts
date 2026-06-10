import { getSql } from "@/lib/pg/pool";
import type postgres from "postgres";
import {
  DailyLessonContent,
  DailyLessonContentSchema,
  LearningContentPoolRow,
  LearningSkill,
} from "@/lib/learning/types";

type PoolRow = {
  id: string;
  skill: string;
  current_clb: number;
  target_clb: number;
  sequence_number: number;
  content: unknown;
  model: string | null;
  created_at: Date;
};

function mapPoolRow(row: PoolRow): LearningContentPoolRow {
  return {
    id: row.id,
    skill: row.skill as LearningSkill,
    currentClb: row.current_clb,
    targetClb: row.target_clb,
    sequenceNumber: row.sequence_number,
    content: DailyLessonContentSchema.parse(row.content),
    model: row.model,
    createdAt: row.created_at,
  };
}

export async function findPoolContent(
  skill: LearningSkill,
  currentClb: number,
  targetClb: number,
  sequenceNumber: number
): Promise<LearningContentPoolRow | null> {
  const sql = getSql();
  const rows = await sql<PoolRow[]>`
    SELECT id, skill, current_clb, target_clb, sequence_number, content, model, created_at
    FROM public.learning_content_pool
    WHERE skill = ${skill}
      AND current_clb = ${currentClb}
      AND target_clb = ${targetClb}
      AND sequence_number = ${sequenceNumber}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? mapPoolRow(row) : null;
}

export async function insertPoolContent(input: {
  skill: LearningSkill;
  currentClb: number;
  targetClb: number;
  sequenceNumber: number;
  content: DailyLessonContent;
  model: string | null;
}): Promise<LearningContentPoolRow> {
  const sql = getSql();
  const rows = await sql<PoolRow[]>`
    INSERT INTO public.learning_content_pool (
      skill, current_clb, target_clb, sequence_number, content, model
    ) VALUES (
      ${input.skill},
      ${input.currentClb},
      ${input.targetClb},
      ${input.sequenceNumber},
      ${sql.json(input.content as postgres.JSONValue)},
      ${input.model}
    )
    ON CONFLICT (skill, current_clb, target_clb, sequence_number) DO UPDATE SET
      content = EXCLUDED.content,
      model = COALESCE(EXCLUDED.model, learning_content_pool.model)
    RETURNING id, skill, current_clb, target_clb, sequence_number, content, model, created_at
  `;
  return mapPoolRow(rows[0]!);
}
