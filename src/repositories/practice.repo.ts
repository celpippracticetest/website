import {
  PracticeDtoSchema,
  PracticeSchema,
  TPracticeDto,
  TPracticeNavItem,
  TPracticeSchema,
} from "@/models/practice.model";
import { ObjectId } from "bson";
import type postgres from "postgres";
import type { AppDocumentsClient } from "@/lib/pg/types";
import { getSql } from "@/lib/pg/pool";

const OID24 = /^[a-f0-9]{24}$/i;

function isPgUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

/**
 * Extract a 24-char hex string from an ObjectId-like value (duplicate-bson–safe).
 */
function taskIdHexLoose(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return /^[a-f0-9]{24}$/i.test(value) ? value.toLowerCase() : null;
  }
  if (value instanceof ObjectId) return value.toHexString().toLowerCase();
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.$oid === "string" && /^[a-f0-9]{24}$/i.test(obj.$oid)) {
      return obj.$oid.toLowerCase();
    }
    if (typeof (obj as { toHexString?: unknown }).toHexString === "function") {
      try {
        const hex = (obj as { toHexString: () => string }).toHexString();
        if (typeof hex === "string" && /^[a-f0-9]{24}$/i.test(hex)) return hex.toLowerCase();
      } catch {
        // fall through
      }
    }
    if (obj._bsontype === "ObjectId" && obj.id) {
      const id = obj.id as { toString?: (enc: string) => string } | Uint8Array;
      const buf = id instanceof Uint8Array ? Buffer.from(id) : Buffer.isBuffer(id) ? id : null;
      if (buf && buf.length === 12) return buf.toString("hex").toLowerCase();
    }
  }
  return null;
}

type PracticeRow = {
  mongo_id: string;
  task_mongo_id: string;
  title: string;
  name: string;
  type: string;
  description: string | null;
  duration: string | null;
  is_free: boolean | null;
  difficulty: string | null;
  total_question: number | null;
  total_passages: number | null;
  instructions: unknown;
  passages: unknown;
  updated_at: Date;
};

function rowToDto(row: PracticeRow): TPracticeDto {
  const instructions =
    row.instructions === null || row.instructions === undefined
      ? undefined
      : (row.instructions as TPracticeDto["instructions"]);
  return PracticeDtoSchema.parse({
    id: row.mongo_id,
    taskId: row.task_mongo_id,
    title: row.title,
    name: row.name,
    type: row.type,
    description: row.description ?? undefined,
    instructions,
    passages: row.passages as TPracticeDto["passages"],
    isFree: row.is_free ?? undefined,
    duration: row.duration ?? undefined,
    difficulty: row.difficulty ?? undefined,
    totalQuestion: row.total_question ?? undefined,
    totalPassages: row.total_passages ?? undefined,
  });
}

function practiceWhereSql(filter: Record<string, unknown>) {
  const sql = getSql();
  const parts = [];
  const rec = filter as Record<string, unknown>;
  const taskHex = rec.taskId != null ? taskIdHexLoose(rec.taskId) : null;
  if (taskHex) {
    parts.push(sql`task_mongo_id = ${taskHex}`);
  }
  if (typeof rec.type === "string" && rec.type.trim() !== "") {
    parts.push(sql`upper(type) = upper(${rec.type})`);
  }
  if (typeof rec.isFree === "boolean") {
    parts.push(sql`is_free = ${rec.isFree}`);
  }
  if (typeof rec.title === "string") {
    parts.push(sql`title = ${rec.title}`);
  }
  if (typeof rec.name === "string") {
    parts.push(sql`name = ${rec.name}`);
  }
  if (typeof rec.description === "string") {
    parts.push(sql`description = ${rec.description}`);
  }
  if (typeof rec.difficulty === "string") {
    parts.push(sql`difficulty = ${rec.difficulty}`);
  }
  if (typeof rec.duration === "string") {
    parts.push(sql`duration = ${rec.duration}`);
  }
  if (typeof rec.totalQuestion === "number" && Number.isFinite(rec.totalQuestion)) {
    parts.push(sql`total_question = ${rec.totalQuestion}`);
  }
  if (typeof rec.totalPassages === "number" && Number.isFinite(rec.totalPassages)) {
    parts.push(sql`total_passages = ${rec.totalPassages}`);
  }
  if (typeof rec.id === "string" && OID24.test(rec.id.trim())) {
    parts.push(sql`mongo_id = ${rec.id.trim().toLowerCase()}`);
  } else if (rec._id != null) {
    const mh = taskIdHexLoose(rec._id);
    if (mh) parts.push(sql`mongo_id = ${mh}`);
  }
  if (parts.length === 0) return sql`true`;
  return parts.reduce((a, b) => sql`${a} AND ${b}`);
}

function practiceRowColumns(sql: ReturnType<typeof getSql>) {
  return sql`
    mongo_id,
    task_mongo_id,
    title,
    name,
    type,
    description,
    duration,
    is_free,
    difficulty,
    total_question,
    total_passages,
    instructions,
    passages,
    updated_at
  `;
}

export class PracticeRepository {
  constructor(_documentsClient: AppDocumentsClient) {
    void _documentsClient;
  }

  private convertFromEntity(practiceEntity: TPracticeSchema) {
    const { taskId, ...rest } = practiceEntity;
    const practice: TPracticeDto = {
      id: practiceEntity._id.toHexString(),
      taskId: taskId.toHexString(),
      ...rest,
    };
    return PracticeDtoSchema.parse(practice);
  }

  async findPractice(id: string): Promise<TPracticeDto | null> {
    const key = id.trim().toLowerCase();
    if (!OID24.test(key)) {
      return null;
    }
    const sql = getSql();
    const cols = practiceRowColumns(sql);
    const rows = await sql<PracticeRow[]>`
      SELECT ${cols}
      FROM public.practices
      WHERE mongo_id = ${key}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async createPractice(dto: Omit<TPracticeDto, "id">): Promise<TPracticeDto> {
    const rawTaskId = String(dto.taskId ?? "").trim();
    if (!OID24.test(rawTaskId)) {
      throw new Error("taskId must be a 24-character hex Mongo ObjectId string");
    }
    const practice = PracticeSchema.parse({
      ...dto,
      taskId: new ObjectId(rawTaskId),
      _id: new ObjectId(),
    });
    const sql = getSql();
    const mongoId = practice._id.toHexString();
    const taskHex = practice.taskId.toHexString().toLowerCase();
    const instructionsJson = sql.json(
      (practice.instructions ?? null) as postgres.JSONValue
    );
    const passagesJson = sql.json(practice.passages as postgres.JSONValue);
    try {
      await sql`
        INSERT INTO public.practices (
          mongo_id,
          task_mongo_id,
          title,
          name,
          type,
          description,
          duration,
          is_free,
          difficulty,
          total_question,
          total_passages,
          instructions,
          passages,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${taskHex},
          ${practice.title},
          ${practice.name},
          ${practice.type},
          ${practice.description ?? null},
          ${practice.duration ?? null},
          ${practice.isFree ?? null},
          ${practice.difficulty ?? null},
          ${practice.totalQuestion ?? null},
          ${practice.totalPassages ?? null},
          ${instructionsJson},
          ${passagesJson},
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
    return this.convertFromEntity(practice);
  }

  async getAllPractice(
    filter: Partial<TPracticeDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{
    items: TPracticeDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const skip = page * limit;
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;
    if (typeof sanitizedFilter.type === "string") {
      sanitizedFilter.type = sanitizedFilter.type.toUpperCase();
    }
    if (sanitizedFilter.taskId != null) {
      const hex = taskIdHexLoose(sanitizedFilter.taskId);
      if (hex) sanitizedFilter.taskId = hex;
    }

    const where = practiceWhereSql(sanitizedFilter);
    const sql = getSql();
    const cols = practiceRowColumns(sql);

    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.practices WHERE ${where}
    `;
    const totalItems = countRows[0]?.c ?? 0;

    const slice = await sql<PracticeRow[]>`
      SELECT ${cols}
      FROM public.practices
      WHERE ${where}
      ORDER BY is_free DESC NULLS LAST, mongo_id ASC
      OFFSET ${skip}
      LIMIT ${limit}
    `;

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      items: slice.map((practice) => rowToDto(practice)),
      page,
      totalItems,
      totalPages,
      hasNextPage: skip + slice.length < totalItems,
    };
  }

  /** Navigation list without passages/instructions — much smaller payload than getAllPractice. */
  async getPracticeNavList(
    filter: Partial<TPracticeDto>,
    page: number = 0,
    limit: number = 200
  ): Promise<{
    items: TPracticeNavItem[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const skip = page * limit;
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    ) as Record<string, unknown>;
    if (typeof sanitizedFilter.type === "string") {
      sanitizedFilter.type = sanitizedFilter.type.toUpperCase();
    }
    if (sanitizedFilter.taskId != null) {
      const hex = taskIdHexLoose(sanitizedFilter.taskId);
      if (hex) sanitizedFilter.taskId = hex;
    }

    const where = practiceWhereSql(sanitizedFilter);
    const sql = getSql();

    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.practices WHERE ${where}
    `;
    const totalItems = countRows[0]?.c ?? 0;

    const slice = await sql<
      {
        mongo_id: string;
        task_mongo_id: string;
        name: string;
        type: string;
        is_free: boolean | null;
      }[]
    >`
      SELECT mongo_id, task_mongo_id, name, type, is_free
      FROM public.practices
      WHERE ${where}
      ORDER BY is_free DESC NULLS LAST, mongo_id ASC
      OFFSET ${skip}
      LIMIT ${limit}
    `;

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      items: slice.map((row) => ({
        id: row.mongo_id,
        taskId: row.task_mongo_id,
        name: row.name,
        type: row.type,
        isFree: row.is_free ?? undefined,
      })),
      page,
      totalItems,
      totalPages,
      hasNextPage: skip + slice.length < totalItems,
    };
  }

  async updatePractice(id: string, dto: Omit<Partial<TPracticeDto>, "id">): Promise<TPracticeDto | null> {
    const idKey = id.trim().toLowerCase();
    if (!OID24.test(idKey)) {
      return null;
    }
    const current = await this.findPractice(idKey);
    if (!current) {
      return null;
    }
    const merged: TPracticeDto = {
      ...current,
      ...dto,
      id: current.id,
      taskId: dto.taskId ?? current.taskId,
    };
    const v = PracticeDtoSchema.parse(merged);

    const sql = getSql();
    const cols = practiceRowColumns(sql);
    const instructionsJson = sql.json((v.instructions ?? null) as postgres.JSONValue);
    const passagesJson = sql.json(v.passages as postgres.JSONValue);
    const rows = await sql<PracticeRow[]>`
      UPDATE public.practices
      SET
        task_mongo_id = ${v.taskId.trim().toLowerCase()},
        title = ${v.title},
        name = ${v.name},
        type = ${v.type},
        description = ${v.description ?? null},
        duration = ${v.duration ?? null},
        is_free = ${v.isFree ?? null},
        difficulty = ${v.difficulty ?? null},
        total_question = ${v.totalQuestion ?? null},
        total_passages = ${v.totalPassages ?? null},
        instructions = ${instructionsJson},
        passages = ${passagesJson},
        updated_at = now()
      WHERE mongo_id = ${idKey}
      RETURNING ${cols}
    `;
    const row = rows[0];
    return row ? rowToDto(row) : null;
  }

  async deletePractice(id: string): Promise<void> {
    const key = id.trim().toLowerCase();
    if (!OID24.test(key)) {
      return;
    }
    const sql = getSql();
    await sql`
      DELETE FROM public.practices WHERE mongo_id = ${key}
    `;
  }
}
