import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import {
  documentRowKey,
  objectIdLikeToHex,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { bindUnsafeParams } from "./bindUnsafeParams";
import { PgAggregateCursor, PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AnswerRow = {
  id: string;
  legacy_mongo_id: string | null;
  user_id: string;
  practice_id: string | null;
  task_id: string | null;
  type: string;
  answers: unknown;
  exam_id: string | null;
  part_id: number | null;
  attempt_id: string | null;
  attempt_key: string;
  text: string | null;
  audio_url: string | null;
  overall_score: number | null;
  result: unknown;
  created_at: Date;
  updated_at: Date;
};

const ANSWER_COLUMNS = `
  id,
  legacy_mongo_id,
  user_id,
  practice_id,
  task_id,
  type,
  answers,
  exam_id,
  part_id,
  attempt_id,
  attempt_key,
  text,
  audio_url,
  overall_score,
  result,
  created_at,
  updated_at
`;

function cloneDoc(doc: AppDoc): AppDoc {
  return EJSON.deserialize(EJSON.serialize(doc)) as AppDoc;
}

function stripSetOnInsert(update: Record<string, unknown>): Record<string, unknown> {
  if (update == null || typeof update !== "object") return update;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(update)) {
    if (k === "$setOnInsert") continue;
    out[k] = v;
  }
  return out;
}

function runMingoUpdate(doc: AppDoc, update: Record<string, unknown>): void {
  mingoUpdate(doc, stripSetOnInsert(update) as never);
}

function applySetOnInsert(doc: AppDoc, update: Record<string, unknown>): void {
  const soi = update.$setOnInsert;
  if (!soi || typeof soi !== "object" || Array.isArray(soi)) return;
  for (const [k, v] of Object.entries(soi as Record<string, unknown>)) {
    (doc as Record<string, unknown>)[k] = v;
  }
}

function filterToPlainDoc(filter: Record<string, unknown>): AppDoc {
  const o: AppDoc = {};
  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) continue;
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v === null ||
      v instanceof ObjectId
    ) {
      (o as Record<string, unknown>)[k] = v;
    }
  }
  return o;
}

function maxScan(): number {
  return Number(process.env.APP_DOCUMENTS_MAX_SCAN || 2_000_000);
}

function asDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function asInt(value: unknown, fallback: number | null): number | null {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?[0-9]+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return fallback;
}

function examIdVariants(value: unknown): string[] | null {
  if (typeof value === "string" && value.trim() !== "") {
    const t = value.trim();
    const out = new Set<string>([t]);
    if (OID_HEX.test(t)) out.add(t.toLowerCase());
    return [...out];
  }
  const hex = objectIdLikeToHex(value);
  if (hex) return [hex];
  return null;
}

function examIdInList(value: unknown): string[] | null {
  if (!value || typeof value !== "object" || !("$in" in value) || !Array.isArray((value as { $in: unknown[] }).$in)) {
    return null;
  }
  const out = new Set<string>();
  for (const item of (value as { $in: unknown[] }).$in) {
    const variants = examIdVariants(item);
    if (variants) for (const v of variants) out.add(v);
  }
  return out.size ? [...out] : null;
}

function answerRowToDoc(row: AnswerRow): AppDoc {
  const metadataAnswers = EJSON.deserialize(row.answers ?? {});
  const resultRaw = row.result != null ? EJSON.deserialize(row.result) : undefined;
  const docId =
    row.legacy_mongo_id && OID_HEX.test(row.legacy_mongo_id)
      ? new ObjectId(row.legacy_mongo_id)
      : row.id;
  const doc: AppDoc = {
    _id: docId,
    userId: row.user_id,
    type: row.type,
    practiceId: row.practice_id ?? undefined,
    taskId: row.task_id ?? undefined,
    examId: row.exam_id ?? undefined,
    partId: row.part_id ?? undefined,
    attemptId: row.attempt_id ?? undefined,
    answers:
      metadataAnswers && typeof metadataAnswers === "object" && !Array.isArray(metadataAnswers)
        ? metadataAnswers
        : {},
    text: row.text ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    overalScore: row.overall_score ?? undefined,
    result: resultRaw,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return doc;
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(answerRowToDoc(r as AnswerRow) as T);
  }
  return out;
}

function answerDocToRow(doc: AppDoc, updatedAt: Date): AnswerRow {
  const legacyHex = objectIdLikeToHex(doc._id);
  const legacyMongoId =
    legacyHex ??
    (typeof doc._id === "string" && OID_HEX.test(doc._id) ? doc._id.toLowerCase() : null);
  const answersSerialized = serializeDocument({
    answers: doc.answers ?? {},
  }) as { answers: unknown };
  const resultSerialized =
    doc.result !== undefined
      ? (serializeDocument({ result: doc.result }) as { result: unknown }).result
      : null;
  const created = asDate(doc.createdAt, updatedAt);
  return {
    id:
      typeof doc._id === "string" && UUID_RE.test(doc._id)
        ? doc._id
        : "00000000-0000-0000-0000-000000000000",
    legacy_mongo_id: legacyMongoId,
    user_id: String(doc.userId ?? ""),
    practice_id:
      doc.practiceId == null || doc.practiceId === undefined
        ? null
        : String(doc.practiceId).toLowerCase(),
    task_id:
      doc.taskId == null || doc.taskId === undefined
        ? null
        : objectIdLikeToHex(doc.taskId) ?? String(doc.taskId),
    type: String(doc.type ?? "LISTENING").toUpperCase(),
    answers: answersSerialized.answers ?? {},
    exam_id:
      doc.examId == null || doc.examId === undefined
        ? null
        : (examIdVariants(doc.examId)?.[0] ?? String(doc.examId)),
    part_id: asInt(doc.partId, null),
    attempt_id:
      doc.attemptId == null || doc.attemptId === undefined ? null : String(doc.attemptId),
    attempt_key:
      doc.attemptId == null || doc.attemptId === undefined || doc.attemptId === ""
        ? ""
        : String(doc.attemptId),
    text: doc.text == null || doc.text === undefined ? null : String(doc.text),
    audio_url:
      doc.audioUrl == null || doc.audioUrl === undefined ? null : String(doc.audioUrl),
    overall_score:
      typeof doc.overalScore === "number" && Number.isFinite(doc.overalScore)
        ? doc.overalScore
        : null,
    result: resultSerialized,
    created_at: created,
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.answers`. */
export function answersFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }
  if ("$or" in filter || "$expr" in filter || "$and" in filter || "$nor" in filter) {
    return null;
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "_id") {
      if (
        v &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        "$in" in (v as object) &&
        Array.isArray((v as { $in: unknown[] }).$in)
      ) {
        const $in = (v as { $in: unknown[] }).$in;
        if (!$in.length) {
          return { clause: "false", params: [] };
        }
        const hexes: string[] = [];
        const uuids: string[] = [];
        for (const item of $in) {
          const hex = objectIdLikeToHex(item);
          if (hex) {
            hexes.push(hex);
            continue;
          }
          if (typeof item === "string" && UUID_RE.test(item.trim())) {
            uuids.push(item.trim());
            continue;
          }
          return null;
        }
        const idParts: string[] = [];
        if (hexes.length) {
          params.push(hexes);
          idParts.push(
            `(legacy_mongo_id = ANY($${paramIndex}::text[]) OR id::text = ANY($${paramIndex}::text[]))`
          );
          paramIndex++;
        }
        if (uuids.length) {
          params.push(uuids);
          idParts.push(`id = ANY($${paramIndex}::uuid[])`);
          paramIndex++;
        }
        if (!idParts.length) return null;
        parts.push(idParts.length === 1 ? idParts[0]! : `(${idParts.join(" OR ")})`);
      } else {
        const hex = objectIdLikeToHex(v);
        if (hex) {
          parts.push(`(legacy_mongo_id = $${paramIndex} OR id::text = $${paramIndex})`);
          params.push(hex);
          paramIndex++;
        } else if (typeof v === "string" && UUID_RE.test(v.trim())) {
          parts.push(`id = $${paramIndex}::uuid`);
          params.push(v.trim());
          paramIndex++;
        } else {
          return null;
        }
      }
    } else if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "practiceId" && typeof v === "string") {
      parts.push(`practice_id = $${paramIndex++}`);
      params.push(v.toLowerCase());
    } else if (k === "practiceId" && v && typeof v === "object" && "$in" in v) {
      const $in = (v as { $in: unknown[] }).$in
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.toLowerCase());
      if (!$in.length) return { clause: "false", params: [] };
      params.push($in);
      parts.push(`practice_id = ANY($${paramIndex++}::text[])`);
    } else if (k === "examId") {
      const variants = examIdInList(v) ?? (examIdVariants(v) ? examIdVariants(v)! : null);
      if (!variants?.length) return null;
      const unique = [...new Set(variants)];
      if (unique.length === 1) {
        params.push(unique[0]);
        parts.push(`exam_id = $${paramIndex++}`);
      } else {
        params.push(unique);
        parts.push(`exam_id = ANY($${paramIndex++}::text[])`);
      }
    } else if (k === "partId" && typeof v === "number") {
      parts.push(`part_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "attemptId" && typeof v === "string") {
      parts.push(`attempt_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "taskId") {
      const hex = objectIdLikeToHex(v) ?? (typeof v === "string" ? v : null);
      if (!hex) return null;
      parts.push(`task_id = $${paramIndex++}`);
      params.push(hex);
    } else if (k === "type" && typeof v === "string") {
      parts.push(`upper(type) = $${paramIndex++}`);
      params.push(v.toUpperCase());
    } else if (k === "type" && v && typeof v === "object" && !Array.isArray(v)) {
      if ("$in" in v && Array.isArray((v as { $in: unknown[] }).$in)) {
        const $in = (v as { $in: unknown[] }).$in
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.toUpperCase());
        if (!$in.length) return { clause: "false", params: [] };
        params.push($in);
        parts.push(`upper(type) = ANY($${paramIndex++}::text[])`);
      } else if ("$nin" in v && Array.isArray((v as { $nin: unknown[] }).$nin)) {
        const $nin = (v as { $nin: unknown[] }).$nin
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.toUpperCase());
        if (!$nin.length) return null;
        params.push($nin);
        parts.push(`upper(type) <> ALL($${paramIndex++}::text[])`);
      } else {
        return null;
      }
    } else if (k === "answers" && v && typeof v === "object" && !Array.isArray(v)) {
      if ("$ne" in v) {
        const ne = (v as { $ne: unknown }).$ne;
        if (
          ne &&
          typeof ne === "object" &&
          !Array.isArray(ne) &&
          Object.keys(ne as object).length === 0
        ) {
          parts.push(`(answers IS NOT NULL AND answers <> '{}'::jsonb)`);
        } else {
          return null;
        }
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  if (parts.length === 0) return { clause: "true", params: [] };
  return { clause: parts.join(" AND "), params };
}

function isPgUniqueViolation(e: unknown): boolean {
  return Boolean(
    e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
  );
}

/** Full table preload for mingo `$lookup` joins. */
export async function loadAnswersForAggregateJoin(sql: Sql): Promise<AppDoc[]> {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM public.answers`;
  const n = rows[0]?.c ?? 0;
  const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
  if (n > budget) {
    throw new Error(
      `answers $lookup preload needs ${n} rows (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
    );
  }
  const all = await sql.unsafe(
    `SELECT ${ANSWER_COLUMNS} FROM public.answers ORDER BY created_at DESC`,
    []
  );
  return mapRowsToDocs(all);
}

/**
 * Postgres-backed `answers` collection (`public.answers`; replaces `app_documents` rows).
 */
export class PgAnswersCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "answers";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.answers`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = answersFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${ANSWER_COLUMNS} FROM public.answers WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan answers with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${ANSWER_COLUMNS} FROM public.answers ORDER BY created_at DESC`,
      []
    );
    return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
  }

  find(filter: Record<string, unknown> = {}, _options?: unknown): PgFindCursor<T> {
    return new PgFindCursor<T>(this as never, filter);
  }

  async findOne<U extends AppDoc = AppDoc>(
    filter: Record<string, unknown> = {},
    options?: { projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1> }
  ): Promise<U | null> {
    const cursor = new PgFindCursor<U>(this as never, filter);
    if (options?.projection) cursor.project(options.projection);
    if (options?.sort) cursor.sort(options.sort);
    cursor.limit(1);
    const arr = await cursor.toArray();
    return (arr[0] ?? null) as U | null;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const sqlParts = answersFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.answers WHERE ${sqlParts.clause}`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return rows[0]?.c ?? 0;
    }
    if (sqlParts?.clause === "true") {
      return this.countAll();
    }
    return (await this.findDocuments(filter)).length;
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const d = doc as AppDoc;
    if (!d._id) d._id = new ObjectId(mongoId);
    const row = answerDocToRow(d, new Date());
    if (!row.legacy_mongo_id) {
      row.legacy_mongo_id = mongoId;
    }
    try {
      await this.sql`
        INSERT INTO public.answers (
          legacy_mongo_id,
          user_id,
          practice_id,
          task_id,
          type,
          answers,
          exam_id,
          part_id,
          attempt_id,
          attempt_key,
          text,
          audio_url,
          overall_score,
          result,
          created_at,
          updated_at
        )
        VALUES (
          ${row.legacy_mongo_id},
          ${row.user_id},
          ${row.practice_id},
          ${row.task_id},
          ${row.type},
          ${this.sql.json(row.answers as never)},
          ${row.exam_id},
          ${row.part_id},
          ${row.attempt_id},
          ${row.attempt_key},
          ${row.text},
          ${row.audio_url},
          ${row.overall_score},
          ${row.result != null ? this.sql.json(row.result as never) : null},
          ${row.created_at},
          ${row.updated_at}
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
    const insertedId: ObjectId | string | number =
      d._id instanceof ObjectId
        ? d._id
        : typeof d._id === "string" || typeof d._id === "number" || typeof d._id === "bigint"
          ? d._id
          : new ObjectId(mongoId);
    return { acknowledged: true, insertedId };
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean }
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number; upsertedCount: number }> {
    return this.updateManyInternal(filter, update, false, options?.upsert === true);
  }

  async updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number }> {
    const r = await this.updateManyInternal(filter, update, true, false);
    return { acknowledged: true, matchedCount: r.matchedCount, modifiedCount: r.modifiedCount };
  }

  private async updateManyInternal(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    many: boolean,
    upsert: boolean
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number; upsertedCount: number }> {
    const matches = await this.findDocuments(filter);
    if (!matches.length) {
      if (upsert && !many) {
        const seed = filterToPlainDoc(filter);
        const next = cloneDoc(seed);
        applySetOnInsert(next, update);
        runMingoUpdate(next, update);
        await this.insertOne(next);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const targets = many ? matches : [matches[0]!];
    let modified = 0;
    const now = new Date();
    for (const doc of targets) {
      const next = cloneDoc(doc);
      runMingoUpdate(next, update);
      const row = answerDocToRow(next, now);
      let rowKey: string;
      try {
        rowKey = documentRowKey(doc);
      } catch {
        rowKey =
          typeof doc._id === "string" && UUID_RE.test(doc._id) ? doc._id : row.id;
      }
      const hex = objectIdLikeToHex(rowKey);
      if (hex) {
        await this.sql`
          UPDATE public.answers
          SET
            user_id = ${row.user_id},
            practice_id = ${row.practice_id},
            task_id = ${row.task_id},
            type = ${row.type},
            answers = ${this.sql.json(row.answers as never)},
            exam_id = ${row.exam_id},
            part_id = ${row.part_id},
            attempt_id = ${row.attempt_id},
            attempt_key = ${row.attempt_key},
            text = ${row.text},
            audio_url = ${row.audio_url},
            overall_score = ${row.overall_score},
            result = ${row.result != null ? this.sql.json(row.result as never) : null},
            updated_at = ${now}
          WHERE legacy_mongo_id = ${hex}
        `;
      } else if (typeof rowKey === "string" && UUID_RE.test(rowKey)) {
        await this.sql`
          UPDATE public.answers
          SET
            user_id = ${row.user_id},
            practice_id = ${row.practice_id},
            task_id = ${row.task_id},
            type = ${row.type},
            answers = ${this.sql.json(row.answers as never)},
            exam_id = ${row.exam_id},
            part_id = ${row.part_id},
            attempt_id = ${row.attempt_id},
            attempt_key = ${row.attempt_key},
            text = ${row.text},
            audio_url = ${row.audio_url},
            overall_score = ${row.overall_score},
            result = ${row.result != null ? this.sql.json(row.result as never) : null},
            updated_at = ${now}
          WHERE id = ${rowKey}::uuid
        `;
      } else if (UUID_RE.test(rowKey)) {
        await this.sql`
          UPDATE public.answers
          SET
            user_id = ${row.user_id},
            practice_id = ${row.practice_id},
            task_id = ${row.task_id},
            type = ${row.type},
            answers = ${this.sql.json(row.answers as never)},
            exam_id = ${row.exam_id},
            part_id = ${row.part_id},
            attempt_id = ${row.attempt_id},
            attempt_key = ${row.attempt_key},
            text = ${row.text},
            audio_url = ${row.audio_url},
            overall_score = ${row.overall_score},
            result = ${row.result != null ? this.sql.json(row.result as never) : null},
            updated_at = ${now}
          WHERE id = ${rowKey}::uuid
        `;
      }
      modified++;
    }
    return {
      acknowledged: true,
      matchedCount: targets.length,
      modifiedCount: modified,
      upsertedCount: 0,
    };
  }

  async findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean; returnDocument?: "before" | "after" }
  ): Promise<T | null> {
    const before = await this.findOne(filter);
    const returnAfter = options?.returnDocument !== "before";
    if (!before) {
      if (options?.upsert) {
        const seed = filterToPlainDoc(filter);
        const next = cloneDoc(seed);
        applySetOnInsert(next, update);
        runMingoUpdate(next, update);
        await this.insertOne(next);
        const created = await this.findOne(filter);
        return returnAfter ? (created as T | null) : null;
      }
      return null;
    }
    await this.updateOne({ _id: before._id }, update);
    const after = await this.findOne({ _id: before._id });
    return returnAfter ? (after as T | null) : (before as T);
  }

  async deleteOne(filter: Record<string, unknown>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const found = await this.findOne(filter);
    if (!found) return { acknowledged: true, deletedCount: 0 };
    const key = documentRowKey(found);
    const hex = objectIdLikeToHex(key);
    if (hex) {
      await this.sql`DELETE FROM public.answers WHERE legacy_mongo_id = ${hex}`;
    } else if (typeof key === "string" && UUID_RE.test(key)) {
      await this.sql`DELETE FROM public.answers WHERE id = ${key}::uuid`;
    } else {
      await this.sql`DELETE FROM public.answers WHERE id = ${String(found._id)}::uuid`;
    }
    return { acknowledged: true, deletedCount: 1 };
  }

  async createIndex(
    _spec: Record<string, 1 | -1>,
    _options?: { unique?: boolean; name?: string }
  ): Promise<string> {
    return "noop_pg_answers_index";
  }

  aggregate(pipeline: object[], _options?: { allowDiskUse?: boolean }): PgAggregateCursor {
    return new PgAggregateCursor(async () => {
      const first = pipeline[0];
      const match =
        first && typeof first === "object" && "$match" in (first as object)
          ? ((first as { $match: Record<string, unknown> }).$match ?? null)
          : null;

      let docs: AppDoc[];
      if (match) {
        const sqlParts = answersFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${ANSWER_COLUMNS} FROM public.answers WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
            bindUnsafeParams(this.sql, sqlParts.params) as never[]
          );
          docs = mapRowsToDocs(rows);
          const q = new Query(match);
          docs = docs.filter((doc) => q.test(doc as never));
          return mingoAggregate(docs, pipeline as never[], {
            collectionResolver: () => [],
          });
        }
      }

      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on answers needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${ANSWER_COLUMNS} FROM public.answers ORDER BY created_at DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
