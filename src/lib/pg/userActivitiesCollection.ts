import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import {
  documentRowKey,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgAggregateCursor, PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type UserActivitiesRow = {
  mongo_id: string;
  user_id: string;
  event_type: string;
  context: string;
  skill: string | null;
  attempt_id: string | null;
  content_id: string | null;
  status: string | null;
  duration_seconds: number | null;
  score_overall: number | null;
  score_breakdown_json: string | null;
  llm_tokens_prompt: number;
  llm_tokens_completion: number;
  ip_address: string | null;
  device_ua_hash: string | null;
  user_agent: string | null;
  notes: string | null;
  email: string | null;
  metadata: unknown;
  timestamp_utc: Date;
  created_at: Date;
  updated_at: Date;
};

const USER_ACTIVITIES_COLUMNS = `
  mongo_id,
  user_id,
  event_type,
  context,
  skill,
  attempt_id,
  content_id,
  status,
  duration_seconds,
  score_overall,
  score_breakdown_json,
  llm_tokens_prompt,
  llm_tokens_completion,
  ip_address,
  device_ua_hash,
  user_agent,
  notes,
  email,
  metadata,
  timestamp_utc,
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

function rowIdToDocId(mongoId: string): ObjectId | string {
  return OID_HEX.test(mongoId) ? new ObjectId(mongoId) : mongoId;
}

function userActivitiesRowToDoc(row: UserActivitiesRow): AppDoc {
  const metadataRaw = EJSON.deserialize(row.metadata ?? {});
  return {
    _id: rowIdToDocId(row.mongo_id),
    userId: row.user_id,
    eventType: row.event_type,
    context: row.context,
    skill: row.skill,
    attemptId: row.attempt_id,
    contentId: row.content_id,
    status: row.status,
    durationSeconds: row.duration_seconds,
    scoreOverall: row.score_overall,
    scoreBreakdownJson: row.score_breakdown_json,
    llmTokensPrompt: row.llm_tokens_prompt,
    llmTokensCompletion: row.llm_tokens_completion,
    ipAddress: row.ip_address,
    deviceUaHash: row.device_ua_hash,
    userAgent: row.user_agent,
    notes: row.notes,
    email: row.email,
    metadata:
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? metadataRaw
        : {},
    timestampUtc: row.timestamp_utc,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userActivitiesRowToDoc(r as UserActivitiesRow) as T);
  }
  return out;
}

function userActivitiesDocToRow(doc: AppDoc, updatedAt: Date): UserActivitiesRow {
  const mongoId = documentRowKey(doc);
  const metadataSerialized = serializeDocument({
    metadata: doc.metadata ?? {},
  }) as { metadata: unknown };
  const ts = asDate(doc.timestampUtc, updatedAt);
  return {
    mongo_id: mongoId,
    user_id: String(doc.userId ?? ""),
    event_type: String(doc.eventType ?? "unknown"),
    context: String(doc.context ?? "system"),
    skill:
      doc.skill == null || doc.skill === undefined ? null : String(doc.skill),
    attempt_id:
      doc.attemptId == null || doc.attemptId === undefined
        ? null
        : String(doc.attemptId),
    content_id:
      doc.contentId == null || doc.contentId === undefined
        ? null
        : String(doc.contentId),
    status:
      doc.status == null || doc.status === undefined ? null : String(doc.status),
    duration_seconds:
      typeof doc.durationSeconds === "number" && Number.isFinite(doc.durationSeconds)
        ? Math.trunc(doc.durationSeconds)
        : null,
    score_overall:
      typeof doc.scoreOverall === "number" && Number.isFinite(doc.scoreOverall)
        ? doc.scoreOverall
        : null,
    score_breakdown_json:
      doc.scoreBreakdownJson == null || doc.scoreBreakdownJson === undefined
        ? null
        : String(doc.scoreBreakdownJson),
    llm_tokens_prompt: asInt(doc.llmTokensPrompt, 0),
    llm_tokens_completion: asInt(doc.llmTokensCompletion, 0),
    ip_address:
      doc.ipAddress == null || doc.ipAddress === undefined
        ? null
        : String(doc.ipAddress),
    device_ua_hash:
      doc.deviceUaHash == null || doc.deviceUaHash === undefined
        ? null
        : String(doc.deviceUaHash),
    user_agent:
      doc.userAgent == null || doc.userAgent === undefined
        ? null
        : String(doc.userAgent),
    notes: doc.notes == null || doc.notes === undefined ? null : String(doc.notes),
    email: doc.email == null || doc.email === undefined ? null : String(doc.email),
    metadata: metadataSerialized.metadata ?? {},
    timestamp_utc: ts,
    created_at: asDate(doc.createdAt, ts),
    updated_at: updatedAt,
  };
}

function parseTimestampFilter(
  fieldSql: string,
  op: string,
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  const d = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  if (op === "$gte") {
    params.push(d);
    return { clause: `${fieldSql} >= $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (op === "$lte") {
    params.push(d);
    return { clause: `${fieldSql} <= $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (op === "$gt") {
    params.push(d);
    return { clause: `${fieldSql} > $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (op === "$lt") {
    params.push(d);
    return { clause: `${fieldSql} < $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  return null;
}

function stringInFilter(column: string, value: unknown, paramIndex: number, params: unknown[]) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("$in" in value)) {
    return null;
  }
  const $in = (value as { $in: unknown[] }).$in;
  const arr = $in.filter((x): x is string => typeof x === "string");
  if (!arr.length) {
    return { clause: "false", nextIndex: paramIndex };
  }
  params.push(arr);
  return { clause: `${column} = ANY($${paramIndex}::text[])`, nextIndex: paramIndex + 1 };
}

function filterHasMingoOnlyKeys(filter: Record<string, unknown>): boolean {
  for (const k of Object.keys(filter)) {
    if (k === "$expr" || k === "$or" || k === "$and" || k === "$nor") return true;
  }
  return false;
}

/** SQL filters for `public.user_activities`. Returns null when the filter needs mingo-only operators. */
export function userActivitiesFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if (filterHasMingoOnlyKeys(filter)) {
    return null;
  }

  const entries = Object.entries(filter);
  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of entries) {
    if (k.startsWith("$")) {
      return null;
    }
    if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "eventType" && typeof v === "string") {
      parts.push(`event_type = $${paramIndex++}`);
      params.push(v);
    } else if (k === "eventType") {
      const parsed = stringInFilter("event_type", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "context" && typeof v === "string") {
      parts.push(`context = $${paramIndex++}`);
      params.push(v);
    } else if (k === "context") {
      const parsed = stringInFilter("context", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "skill") {
      const parsed = stringInFilter("skill", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "status") {
      const parsed = stringInFilter("status", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "timestampUtc" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("timestamp_utc", op, val, paramIndex, params);
        if (!parsed) return null;
        parts.push(parsed.clause);
        paramIndex = parsed.nextIndex;
      }
    } else if (k === "scoreOverall" && v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if ("$exists" in o && o.$exists === false) {
        parts.push("score_overall IS NULL");
      } else if ("$exists" in o && o.$exists === true && "$ne" in o && o.$ne === null) {
        parts.push("score_overall IS NOT NULL");
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  if (parts.length === 0) return null;
  return { clause: parts.join(" AND "), params };
}

/** Full collection preload for mingo `$lookup` from other aggregates (e.g. users cron). */
export async function loadUserActivitiesForAggregateJoin(sql: Sql): Promise<AppDoc[]> {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM public.user_activities`;
  const n = rows[0]?.c ?? 0;
  const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
  if (n > budget) {
    throw new Error(
      `useractivities $lookup preload needs ${n} rows (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
    );
  }
  const all = await sql.unsafe(
    `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities ORDER BY mongo_id`,
    []
  );
  return mapRowsToDocs(all);
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
 * Postgres-backed `useractivities` event log (replaces `app_documents` rows).
 * Not to be confused with `user_activity` (session heartbeat).
 */
export class PgUserActivitiesCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "useractivities";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities ORDER BY mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.user_activities`;
    return rows[0]?.c ?? 0;
  }

  private async loadByUserId(userId: string): Promise<T[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities WHERE user_id = $1 ORDER BY timestamp_utc DESC`,
      [userId]
    );
    return mapRowsToDocs<T>(rows);
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userActivitiesFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities WHERE ${sqlParts.clause} ORDER BY timestamp_utc DESC`,
        sqlParts.params as never[]
      );
      const docs = mapRowsToDocs<T>(rows);
      if (!filterHasMingoOnlyKeys(filter)) {
        return docs;
      }
      return docs.filter((doc) => q.test(doc as never));
    }

    const userId = typeof filter.userId === "string" ? filter.userId : null;
    if (userId) {
      const docs = await this.loadByUserId(userId);
      return docs.filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan user_activities with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities ORDER BY timestamp_utc DESC`,
      []
    );
    const docs = mapRowsToDocs<T>(rows);
    return docs.filter((doc) => q.test(doc as never));
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
    const sqlParts = userActivitiesFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true" && !filterHasMingoOnlyKeys(filter)) {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.user_activities WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
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
    const row = userActivitiesDocToRow(doc as AppDoc, new Date());
    try {
      await this.sql`
        INSERT INTO public.user_activities (
          mongo_id,
          user_id,
          event_type,
          context,
          skill,
          attempt_id,
          content_id,
          status,
          duration_seconds,
          score_overall,
          score_breakdown_json,
          llm_tokens_prompt,
          llm_tokens_completion,
          ip_address,
          device_ua_hash,
          user_agent,
          notes,
          email,
          metadata,
          timestamp_utc,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.user_id},
          ${row.event_type},
          ${row.context},
          ${row.skill},
          ${row.attempt_id},
          ${row.content_id},
          ${row.status},
          ${row.duration_seconds},
          ${row.score_overall},
          ${row.score_breakdown_json},
          ${row.llm_tokens_prompt},
          ${row.llm_tokens_completion},
          ${row.ip_address},
          ${row.device_ua_hash},
          ${row.user_agent},
          ${row.notes},
          ${row.email},
          ${this.sql.json(row.metadata as never)},
          ${row.timestamp_utc},
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

  aggregate(pipeline: object[], _options?: { allowDiskUse?: boolean }): PgAggregateCursor {
    return new PgAggregateCursor(async () => {
      const first = pipeline[0];
      const match =
        first && typeof first === "object" && "$match" in (first as object)
          ? ((first as { $match: Record<string, unknown> }).$match ?? null)
          : null;

      let docs: AppDoc[];
      if (match) {
        const sqlParts = userActivitiesFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities WHERE ${sqlParts.clause} ORDER BY timestamp_utc DESC`,
            sqlParts.params as never[]
          );
          docs = mapRowsToDocs(rows);
          if (filterHasMingoOnlyKeys(match)) {
            const q = new Query(match);
            docs = docs.filter((doc) => q.test(doc as never));
          }
          return mingoAggregate(docs, pipeline as never[], {
            collectionResolver: () => [],
          });
        }
        const userId = typeof match.userId === "string" ? match.userId : null;
        if (userId) {
          docs = await this.loadByUserId(userId);
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
          `Aggregate on useractivities needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${USER_ACTIVITIES_COLUMNS} FROM public.user_activities ORDER BY timestamp_utc DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
