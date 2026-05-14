import {
  ExamSchema,
  ExamSchemaDto,
  TExamSchema,
  TExamSchemaDto,
} from "@/models/exam.model";
import { ObjectId } from "bson";
import type { AppDocumentsClient } from "@/lib/pg/types";
import { getSql } from "@/lib/pg/pool";

type ExamRow = {
  mongo_id: string;
  name: string;
  sort_order: number;
  is_ready: boolean;
  created_at: Date;
  updated_at: Date;
};

function isPgUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function rowToDto(row: ExamRow): TExamSchemaDto {
  return ExamSchemaDto.parse({
    id: row.mongo_id,
    name: row.name,
    order: row.sort_order,
    isReady: row.is_ready,
    createdAt: row.created_at,
  });
}

function examWhereSql(filter: Partial<TExamSchemaDto>) {
  const sql = getSql();
  const parts = [];
  if (filter.id != null && String(filter.id).trim() !== "") {
    parts.push(sql`mongo_id = ${String(filter.id)}`);
  }
  if (filter.name != null) {
    parts.push(sql`name = ${filter.name}`);
  }
  if (typeof filter.order === "number" && Number.isFinite(filter.order)) {
    parts.push(sql`sort_order = ${filter.order}`);
  }
  if (typeof filter.isReady === "boolean") {
    parts.push(sql`is_ready = ${filter.isReady}`);
  }
  if (parts.length === 0) return sql`true`;
  return parts.reduce((a, b) => sql`${a} AND ${b}`);
}

export class ExamRepository {
  constructor(_documentsClient: AppDocumentsClient) {
    void _documentsClient;
  }

  private convertFromEntity(taskEntity: TExamSchema) {
    const task: TExamSchemaDto = {
      id: taskEntity._id.toHexString(),
      ...taskEntity,
    };
    return ExamSchemaDto.parse(task);
  }

  async findExamById(id: string): Promise<TExamSchemaDto | null> {
    const sql = getSql();
    const rows = await sql<ExamRow[]>`
      SELECT mongo_id, name, sort_order, is_ready, created_at, updated_at
      FROM public.exams
      WHERE mongo_id = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async createExam(dto: Omit<TExamSchemaDto, "id">): Promise<TExamSchemaDto> {
    const task = ExamSchema.parse({
      ...dto,
      _id: new ObjectId(),
    });
    const sql = getSql();
    const mongoId = task._id.toHexString();
    try {
      await sql`
        INSERT INTO public.exams (mongo_id, name, sort_order, is_ready, created_at, updated_at)
        VALUES (
          ${mongoId},
          ${task.name},
          ${task.order},
          ${task.isReady},
          ${task.createdAt},
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

  async getAllExam(
    filter: Partial<TExamSchemaDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{
    items: TExamSchemaDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const sql = getSql();
    const skip = page * limit;
    const where = examWhereSql(filter);

    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.exams WHERE ${where}
    `;
    const totalItems = countRows[0]?.c ?? 0;

    const rawItems = await sql<ExamRow[]>`
      SELECT mongo_id, name, sort_order, is_ready, created_at, updated_at
      FROM public.exams
      WHERE ${where}
      ORDER BY sort_order ASC
      OFFSET ${skip}
      LIMIT ${limit}
    `;

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    const hasNextPage = skip + rawItems.length < totalItems;

    return {
      items: rawItems.map((row) => rowToDto(row)),
      page,
      totalItems,
      totalPages,
      hasNextPage,
    };
  }

  async updateExam(
    idOrFilter: string | { _id: ObjectId } | Partial<TExamSchemaDto>,
    dto: Omit<Partial<TExamSchemaDto>, "id">
  ): Promise<TExamSchemaDto | null> {
    const sql = getSql();
    let mongoId: string | null = null;

    if (typeof idOrFilter === "string") {
      mongoId = idOrFilter;
    } else if ((idOrFilter as { _id?: ObjectId })?._id instanceof ObjectId) {
      mongoId = (idOrFilter as { _id: ObjectId })._id.toHexString();
    } else if ((idOrFilter as { id?: string })?.id) {
      mongoId = String((idOrFilter as { id: string }).id);
    } else {
      const f = idOrFilter as Partial<TExamSchemaDto>;
      const rows = await sql<{ mongo_id: string }[]>`
        SELECT mongo_id
        FROM public.exams
        WHERE ${examWhereSql(f)}
        ORDER BY sort_order ASC
        LIMIT 1
      `;
      mongoId = rows[0]?.mongo_id ?? null;
    }

    if (!mongoId) {
      return null;
    }

    const current = await this.findExamById(mongoId);
    if (!current) {
      return null;
    }

    const nextName = dto.name !== undefined ? dto.name : current.name;
    const nextOrder = dto.order !== undefined ? dto.order : current.order;
    const dtoAny = dto as { isReady?: boolean };
    const nextReady =
      dtoAny.isReady !== undefined ? dtoAny.isReady : current.isReady;
    const nextCreatedAt =
      dto.createdAt !== undefined ? new Date(dto.createdAt as Date | string | number) : current.createdAt;

    if (
      nextName === current.name &&
      nextOrder === current.order &&
      nextReady === current.isReady &&
      nextCreatedAt.getTime() === current.createdAt.getTime()
    ) {
      return current;
    }

    const updated = await sql<ExamRow[]>`
      UPDATE public.exams
      SET
        name = ${nextName},
        sort_order = ${nextOrder},
        is_ready = ${nextReady},
        created_at = ${nextCreatedAt},
        updated_at = now()
      WHERE mongo_id = ${mongoId}
      RETURNING mongo_id, name, sort_order, is_ready, created_at, updated_at
    `;
    const row = updated[0];
    return row ? rowToDto(row) : null;
  }

  async deleteExam(idOrFilter: string | { _id: ObjectId } | Partial<TExamSchemaDto>) {
    const sql = getSql();
    let mongoId: string | null = null;

    if (typeof idOrFilter === "string") {
      mongoId = idOrFilter;
    } else if ((idOrFilter as { _id?: ObjectId })?._id instanceof ObjectId) {
      mongoId = (idOrFilter as { _id: ObjectId })._id.toHexString();
    } else if ((idOrFilter as { id?: string })?.id) {
      mongoId = String((idOrFilter as { id: string }).id);
    } else {
      const f = idOrFilter as Partial<TExamSchemaDto>;
      const rows = await sql<{ mongo_id: string }[]>`
        SELECT mongo_id
        FROM public.exams
        WHERE ${examWhereSql(f)}
        ORDER BY sort_order ASC
        LIMIT 1
      `;
      mongoId = rows[0]?.mongo_id ?? null;
    }

    if (!mongoId) {
      return { acknowledged: true, deletedCount: 0 };
    }

    const del = await sql<{ mongo_id: string }[]>`
      DELETE FROM public.exams
      WHERE mongo_id = ${mongoId}
      RETURNING mongo_id
    `;
    return { acknowledged: true, deletedCount: del.length };
  }
}
