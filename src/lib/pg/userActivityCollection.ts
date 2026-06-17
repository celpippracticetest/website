import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import {
  documentRowKey,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { bindUnsafeParams } from "./bindUnsafeParams";
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type UserActivityRow = {
  mongo_id: string;
  user_id: string | null;
  session_id: string;
  last_active_at: Date | null;
  status: string;
  user_agent: string | null;
  ip: string | null;
  last_offline_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const USER_ACTIVITY_COLUMNS = `
  mongo_id,
  user_id,
  session_id,
  last_active_at,
  status,
  user_agent,
  ip,
  last_offline_at,
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

function rowIdToDocId(mongoId: string): ObjectId | string {
  return OID_HEX.test(mongoId) ? new ObjectId(mongoId) : mongoId;
}

function userActivityRowToDoc(row: UserActivityRow): AppDoc {
  return {
    _id: rowIdToDocId(row.mongo_id),
    userId: row.user_id,
    sessionId: row.session_id,
    lastActiveAt: row.last_active_at,
    status: row.status,
    userAgent: row.user_agent,
    ip: row.ip,
    lastOfflineAt: row.last_offline_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userActivityRowToDoc(r as UserActivityRow) as T);
  }
  return out;
}

function userActivityDocToRow(doc: AppDoc, updatedAt: Date): UserActivityRow {
  const mongoId = documentRowKey(doc);
  const sessionId =
    typeof doc.sessionId === "string" && doc.sessionId.trim() !== ""
      ? doc.sessionId.trim()
      : mongoId;
  return {
    mongo_id: mongoId,
    user_id:
      doc.userId === null || doc.userId === undefined
        ? null
        : String(doc.userId),
    session_id: sessionId,
    last_active_at:
      doc.lastActiveAt == null ? null : asDate(doc.lastActiveAt, updatedAt),
    status: String(doc.status ?? "offline"),
    user_agent:
      doc.userAgent == null || doc.userAgent === undefined
        ? null
        : String(doc.userAgent),
    ip: doc.ip == null || doc.ip === undefined ? null : String(doc.ip),
    last_offline_at:
      doc.lastOfflineAt == null ? null : asDate(doc.lastOfflineAt, updatedAt),
    created_at: asDate(doc.createdAt, updatedAt),
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

function userActivityFilterBranchToSql(
  field: string,
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  if (field === "status" && typeof value === "string") {
    params.push(value);
    return { clause: `status = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (field === "userId") {
    if (value === null) {
      return { clause: "user_id IS NULL", nextIndex: paramIndex };
    }
    if (typeof value === "string") {
      params.push(value);
      return { clause: `user_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
    return null;
  }
  if (field === "sessionId" && typeof value === "string") {
    params.push(value);
    return { clause: `session_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (field === "lastActiveAt" && value && typeof value === "object" && !Array.isArray(value)) {
    const ops = Object.entries(value as Record<string, unknown>);
    if (ops.length !== 1) return null;
    const [op, val] = ops[0]!;
    return parseTimestampFilter("last_active_at", op, val, paramIndex, params);
  }
  return null;
}

/** SQL for `public.user_activity` filters used by heartbeat / active-users routes. */
export function userActivityFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if (Object.keys(filter).length === 1 && "$or" in filter) {
    const branches = (filter as { $or: unknown[] }).$or;
    if (!Array.isArray(branches) || branches.length === 0) {
      return { clause: "false", params: [] };
    }
    const parts: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    for (const branch of branches) {
      if (!branch || typeof branch !== "object" || Array.isArray(branch)) return null;
      const entries = Object.entries(branch as Record<string, unknown>);
      if (entries.length !== 1) return null;
      const [field, value] = entries[0]!;
      const parsed = userActivityFilterBranchToSql(field, value, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    }
    return { clause: `(${parts.join(" OR ")})`, params };
  }

  const entries = Object.entries(filter);
  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of entries) {
    if (k.startsWith("$")) {
      return null;
    }
    const parsed = userActivityFilterBranchToSql(k, v, paramIndex, params);
    if (!parsed) return null;
    parts.push(parsed.clause);
    paramIndex = parsed.nextIndex;
  }

  if (parts.length === 0) return null;
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
 * Postgres-backed `user_activity` presence collection (replaces `app_documents` rows).
 */
export class PgUserActivityCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "user_activity";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${USER_ACTIVITY_COLUMNS} FROM public.user_activity ORDER BY mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.user_activity`;
    return rows[0]?.c ?? 0;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const sqlParts = userActivityFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.user_activity WHERE ${sqlParts.clause}`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return rows[0]?.c ?? 0;
    }
    if (sqlParts?.clause === "true") {
      return this.countAll();
    }
    return (await this.findDocuments(filter)).length;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userActivityFilterToSql(filter);
    const needsWideScan = sqlParts == null || sqlParts.clause === "true";

    if (needsWideScan) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan user_activity with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_ACTIVITY_COLUMNS} FROM public.user_activity WHERE ${sqlParts.clause} ORDER BY mongo_id`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows);
    }

    const rows = await this.sql.unsafe(
      `SELECT ${USER_ACTIVITY_COLUMNS} FROM public.user_activity ORDER BY mongo_id`,
      []
    );
    const docs = mapRowsToDocs<T>(rows);
    const q = new Query(filter);
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

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = userActivityDocToRow(doc as AppDoc, new Date());
    try {
      await this.sql`
        INSERT INTO public.user_activity (
          mongo_id,
          user_id,
          session_id,
          last_active_at,
          status,
          user_agent,
          ip,
          last_offline_at,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.user_id},
          ${row.session_id},
          ${row.last_active_at},
          ${row.status},
          ${row.user_agent},
          ${row.ip},
          ${row.last_offline_at},
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
      const row = userActivityDocToRow(next, now);
      await this.sql`
        UPDATE public.user_activity
        SET
          user_id = ${row.user_id},
          session_id = ${row.session_id},
          last_active_at = ${row.last_active_at},
          status = ${row.status},
          user_agent = ${row.user_agent},
          ip = ${row.ip},
          last_offline_at = ${row.last_offline_at},
          created_at = ${row.created_at},
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
}
