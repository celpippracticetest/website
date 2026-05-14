import {
  ExamPartSchema,
  ExamPartSchemaDto,
  TExamPartSchema,
  TExamPartSchemaDto,
} from "@/models/examParts.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient } from "@/lib/pg/types";
import { objectIdLikeToHex } from "@/lib/pg/document";
import { getSql } from "@/lib/pg/pool";

const OID24 = /^[a-f0-9]{24}$/i;

function isPgUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function examIdHexFromUnknown(value: unknown): string | null {
  return objectIdLikeToHex(value);
}

function partIdFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  if (!value || typeof value !== "object") return undefined;
  const o = value as Record<string, unknown>;
  if (typeof o.$numberInt === "string") return Number(o.$numberInt);
  if (typeof o.$numberLong === "string") return Number(o.$numberLong);
  return undefined;
}

type ExamPartRow = {
  mongo_id: string;
  exam_mongo_id: string;
  part_id: number;
  name: string;
  title: string;
  type: string;
  description: string | null;
  duration: string | null;
  total_question: number | null;
  total_passages: number | null;
  instructions: unknown;
  passages: unknown;
  updated_at: Date;
};

function rowToDto(row: ExamPartRow): TExamPartSchemaDto {
  const instructions =
    row.instructions === null || row.instructions === undefined
      ? undefined
      : (row.instructions as TExamPartSchemaDto["instructions"]);
  return ExamPartSchemaDto.parse({
    id: row.mongo_id,
    examId: row.exam_mongo_id,
    partId: row.part_id,
    name: row.name,
    title: row.title,
    type: row.type,
    description: row.description ?? undefined,
    duration: row.duration ?? undefined,
    totalQuestion: row.total_question ?? undefined,
    totalPassages: row.total_passages ?? undefined,
    instructions,
    passages: row.passages as TExamPartSchemaDto["passages"],
  });
}

function examPartWhereSql(filterRecord: Record<string, unknown>, examHex: string | null) {
  const sql = getSql();
  const parts = [];
  if (examHex) {
    parts.push(sql`exam_mongo_id = ${examHex}`);
  }
  const partId = partIdFromUnknown(filterRecord.partId);
  if (partId !== undefined && Number.isFinite(partId)) {
    parts.push(sql`part_id = ${partId}`);
  }
  if (typeof filterRecord.name === "string") {
    parts.push(sql`name = ${filterRecord.name}`);
  }
  if (typeof filterRecord.title === "string") {
    parts.push(sql`title = ${filterRecord.title}`);
  }
  if (typeof filterRecord.type === "string") {
    parts.push(sql`type = ${filterRecord.type}`);
  }
  const idHex =
    filterRecord._id instanceof ObjectId
      ? filterRecord._id.toHexString().toLowerCase()
      : examIdHexFromUnknown(filterRecord._id);
  if (idHex && OID24.test(idHex)) {
    parts.push(sql`mongo_id = ${idHex}`);
  }
  if (parts.length === 0) return sql`true`;
  return parts.reduce((a, b) => sql`${a} AND ${b}`);
}

export class ExamPartsRepository {
  constructor(_documentsClient: AppDocumentsClient) {
    void _documentsClient;
  }

  private convertFromEntity(taskEntity: TExamPartSchema) {
    const task: TExamPartSchemaDto = {
      id: taskEntity._id.toHexString(),
      ...taskEntity,
      examId: taskEntity.examId.toString(),
    };
    return ExamPartSchemaDto.parse(task);
  }

  async findExamPartByExamIdAndPartId(
    examId: string,
    partId: number
  ): Promise<TExamPartSchemaDto | null> {
    const wantExamHex =
      examIdHexFromUnknown(examId) ?? (OID24.test(examId) ? examId.toLowerCase() : null);
    if (wantExamHex == null || !Number.isFinite(partId)) {
      return null;
    }
    const sql = getSql();
    const rows = await sql<ExamPartRow[]>`
      SELECT
        mongo_id,
        exam_mongo_id,
        part_id,
        name,
        title,
        type,
        description,
        duration,
        total_question,
        total_passages,
        instructions,
        passages,
        updated_at
      FROM public.exam_parts
      WHERE exam_mongo_id = ${wantExamHex} AND part_id = ${partId}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async findById(id: string): Promise<TExamPartSchemaDto | null> {
    const sql = getSql();
    const rows = await sql<ExamPartRow[]>`
      SELECT
        mongo_id,
        exam_mongo_id,
        part_id,
        name,
        title,
        type,
        description,
        duration,
        total_question,
        total_passages,
        instructions,
        passages,
        updated_at
      FROM public.exam_parts
      WHERE mongo_id = ${id.toLowerCase()}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async deletePractice(id: string): Promise<void> {
    const sql = getSql();
    await sql`
      DELETE FROM public.exam_parts WHERE mongo_id = ${id.toLowerCase()}
    `;
  }

  async updateExam(
    id: string,
    dto: Omit<Partial<TExamPartSchemaDto>, "id">
  ): Promise<TExamPartSchemaDto | null> {
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    const merged: TExamPartSchemaDto = {
      ...current,
      ...dto,
      id: current.id,
      examId: dto.examId ?? current.examId,
    };
    const v = ExamPartSchemaDto.parse(merged);

    const sql = getSql();
    const rows = await sql<ExamPartRow[]>`
      UPDATE public.exam_parts
      SET
        exam_mongo_id = ${v.examId.toLowerCase()},
        part_id = ${v.partId},
        name = ${v.name},
        title = ${v.title},
        type = ${v.type},
        description = ${v.description ?? null},
        duration = ${v.duration ?? null},
        total_question = ${v.totalQuestion ?? null},
        total_passages = ${v.totalPassages ?? null},
        instructions = ${v.instructions ?? null},
        passages = ${v.passages as object},
        updated_at = now()
      WHERE mongo_id = ${id.toLowerCase()}
      RETURNING
        mongo_id,
        exam_mongo_id,
        part_id,
        name,
        title,
        type,
        description,
        duration,
        total_question,
        total_passages,
        instructions,
        passages,
        updated_at
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async createExamPart(dto: Omit<TExamPartSchemaDto, "id">): Promise<TExamPartSchemaDto> {
    const task = ExamPartSchema.parse({
      ...dto,
      examId: new ObjectId(dto.examId.toString()),
      _id: new ObjectId(),
    });
    const sql = getSql();
    const mongoId = task._id.toHexString();
    const examHex = task.examId.toHexString().toLowerCase();
    try {
      await sql`
        INSERT INTO public.exam_parts (
          mongo_id,
          exam_mongo_id,
          part_id,
          name,
          title,
          type,
          description,
          duration,
          total_question,
          total_passages,
          instructions,
          passages,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${examHex},
          ${task.partId},
          ${task.name},
          ${task.title},
          ${task.type},
          ${task.description ?? null},
          ${task.duration ?? null},
          ${task.totalQuestion ?? null},
          ${task.totalPassages ?? null},
          ${task.instructions ?? null},
          ${task.passages as object},
          now()
        )
      `;
    } catch (e: unknown) {
      if (isPgUniqueViolation(e)) {
        const err = new Error("E11000 duplicate key error") as Error & { code: number };
        err.code = 11000;
        throw err;
      }
      throw e;
    }
    return this.convertFromEntity(task);
  }

  async getAllExamPart(
    filter: Partial<TExamPartSchema>,
    page: number = 0,
    limit: number = 21
  ): Promise<{
    items: TExamPartSchemaDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const skip = page * limit;
    const filterRecord = filter as Record<string, unknown>;
    const examIdRaw = filterRecord.examId;
    const wantExamHex =
      examIdRaw !== undefined && examIdRaw !== null
        ? examIdHexFromUnknown(examIdRaw) ??
          (typeof examIdRaw === "string" && OID24.test(examIdRaw) ? examIdRaw.toLowerCase() : null)
        : null;

    const rest = { ...filterRecord };
    delete rest.examId;

    const where = examPartWhereSql(rest, wantExamHex);
    const sql = getSql();

    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.exam_parts WHERE ${where}
    `;
    const totalItems = countRows[0]?.c ?? 0;

    const raw = await sql<ExamPartRow[]>`
      SELECT
        mongo_id,
        exam_mongo_id,
        part_id,
        name,
        title,
        type,
        description,
        duration,
        total_question,
        total_passages,
        instructions,
        passages,
        updated_at
      FROM public.exam_parts
      WHERE ${where}
      ORDER BY exam_mongo_id ASC, part_id ASC
      OFFSET ${skip}
      LIMIT ${limit}
    `;

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      items: raw.map((p) => rowToDto(p)),
      page,
      totalItems,
      totalPages,
      hasNextPage: skip + raw.length < totalItems,
    };
  }

  async countPartsByExamIds(examIds: string[]): Promise<Record<string, number>> {
    if (examIds.length === 0) {
      return {};
    }
    const oidList = examIds
      .filter((id) => OID24.test(id))
      .map((id) => id.toLowerCase());
    if (oidList.length === 0) {
      return {};
    }
    const sql = getSql();
    const rows = await sql<{ exam_mongo_id: string; c: number }[]>`
      SELECT exam_mongo_id, COUNT(*)::int AS c
      FROM public.exam_parts
      WHERE exam_mongo_id = ANY(${oidList})
      GROUP BY exam_mongo_id
    `;
    const out: Record<string, number> = {};
    for (const row of rows) {
      out[row.exam_mongo_id] = row.c;
    }
    return out;
  }
}
