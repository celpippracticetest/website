import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
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
const COMPLEXITY_LEVELS = new Set(["beginner", "intermediate", "advanced"]);

type UserWordRow = {
  mongo_id: string;
  user_id: string;
  word: string;
  is_learned: boolean;
  reviewed_times: number;
  complexity_level: string;
  created_at: Date;
  updated_at: Date;
};

const USER_WORD_COLUMNS = `
  mongo_id,
  user_id,
  word,
  is_learned,
  reviewed_times,
  complexity_level,
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

function asInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?[0-9]+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return fallback;
}

function normalizeComplexity(value: unknown): string {
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (COMPLEXITY_LEVELS.has(v)) return v;
  }
  return "intermediate";
}

function userWordRowToDoc(row: UserWordRow): AppDoc {
  return {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    userId: row.user_id,
    word: row.word,
    isLearned: row.is_learned,
    reviewedTimes: row.reviewed_times,
    complexityLevel: row.complexity_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userWordRowToDoc(r as UserWordRow) as T);
  }
  return out;
}

function userWordDocToRow(doc: AppDoc, updatedAt: Date): UserWordRow {
  const mongoId = documentRowKey(doc);
  const created = asDate(doc.createdAt, updatedAt);
  return {
    mongo_id: mongoId,
    user_id: String(doc.userId ?? ""),
    word: String(doc.word ?? "").toLowerCase().trim(),
    is_learned: Boolean(doc.isLearned),
    reviewed_times: asInt(doc.reviewedTimes, 0),
    complexity_level: normalizeComplexity(doc.complexityLevel),
    created_at: created,
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.user_words`. */
export function userWordsFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }
  if ("$or" in filter || "$expr" in filter || "$and" in filter) {
    return null;
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "word" && typeof v === "string") {
      parts.push(`word = $${paramIndex++}`);
      params.push(v.toLowerCase().trim());
    } else if (k === "word" && v && typeof v === "object" && "$in" in v) {
      const $in = (v as { $in: unknown[] }).$in
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.toLowerCase().trim());
      if (!$in.length) return { clause: "false", params: [] };
      params.push($in);
      parts.push(`word = ANY($${paramIndex++}::text[])`);
    } else if (k === "_id") {
      const hex = objectIdLikeToHex(v);
      if (!hex) return null;
      params.push(hex);
      parts.push(`mongo_id = $${paramIndex++}`);
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

/**
 * Postgres-backed `userwords` collection (replaces `app_documents` rows).
 */
export class PgUserWordsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "userwords";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.user_words`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userWordsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_WORD_COLUMNS} FROM public.user_words WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan user_words with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${USER_WORD_COLUMNS} FROM public.user_words ORDER BY created_at DESC`,
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
    const sqlParts = userWordsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.user_words WHERE ${sqlParts.clause}`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = userWordDocToRow(doc as AppDoc, new Date());
    if (!row.user_id || !row.word) {
      throw new Error("userwords requires userId and word");
    }
    try {
      await this.sql`
        INSERT INTO public.user_words (
          mongo_id,
          user_id,
          word,
          is_learned,
          reviewed_times,
          complexity_level,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.user_id},
          ${row.word},
          ${row.is_learned},
          ${row.reviewed_times},
          ${row.complexity_level},
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
    const d = doc as AppDoc;
    const insertedId: ObjectId | string | number =
      d._id instanceof ObjectId
        ? d._id
        : typeof d._id === "string" || typeof d._id === "number" || typeof d._id === "bigint"
          ? d._id
          : new ObjectId(mongoId);
    return { acknowledged: true, insertedId };
  }

  async insertMany(docs: unknown[], options?: { ordered?: boolean }): Promise<{
    acknowledged: boolean;
    insertedCount: number;
    insertedIds: Record<number, ObjectId | string | number>;
  }> {
    const ordered = options?.ordered !== false;
    const insertedIds: Record<number, ObjectId | string | number> = {};
    let count = 0;
    for (let i = 0; i < docs.length; i++) {
      try {
        const r = await this.insertOne(docs[i]);
        insertedIds[i] = r.insertedId;
        count++;
      } catch (e) {
        if (ordered) throw e;
      }
    }
    return { acknowledged: true, insertedCount: count, insertedIds };
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean }
  ): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedCount: number;
  }> {
    return this.updateManyInternal(filter, update, false, options?.upsert === true);
  }

  private async updateManyInternal(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    many: boolean,
    upsert: boolean
  ): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedCount: number;
  }> {
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
      const row = userWordDocToRow(next, now);
      await this.sql`
        UPDATE public.user_words
        SET
          is_learned = ${row.is_learned},
          reviewed_times = ${row.reviewed_times},
          complexity_level = ${row.complexity_level},
          updated_at = ${now}
        WHERE mongo_id = ${row.mongo_id}
      `;
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
    const hex = objectIdLikeToHex(documentRowKey(found));
    if (hex) {
      await this.sql`DELETE FROM public.user_words WHERE mongo_id = ${hex}`;
    } else if (typeof found.userId === "string" && typeof found.word === "string") {
      await this.sql`
        DELETE FROM public.user_words
        WHERE user_id = ${found.userId} AND word = ${String(found.word).toLowerCase().trim()}
      `;
    }
    return { acknowledged: true, deletedCount: 1 };
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
        const sqlParts = userWordsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${USER_WORD_COLUMNS} FROM public.user_words WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
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
          `Aggregate on userwords needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${USER_WORD_COLUMNS} FROM public.user_words ORDER BY created_at DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
