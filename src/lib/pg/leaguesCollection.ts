import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
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
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type LeagueRow = {
  mongo_id: string;
  name: string;
  league_type: string;
  description: string | null;
  requirements: unknown;
  rewards: unknown;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const LEAGUE_COLUMNS = `
  mongo_id,
  name,
  league_type,
  description,
  requirements,
  rewards,
  is_active,
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

function leagueRowToDoc(row: LeagueRow): AppDoc {
  const requirements = EJSON.deserialize(row.requirements ?? {});
  const rewards = EJSON.deserialize(row.rewards ?? {});
  return {
    _id: rowIdToDocId(row.mongo_id),
    name: row.name,
    type: row.league_type,
    description: row.description ?? undefined,
    requirements:
      requirements && typeof requirements === "object" && !Array.isArray(requirements)
        ? requirements
        : {},
    rewards:
      rewards && typeof rewards === "object" && !Array.isArray(rewards) ? rewards : {},
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(leagueRowToDoc(r as LeagueRow) as T);
  }
  return out;
}

function leagueDocToRow(doc: AppDoc, updatedAt: Date): LeagueRow {
  const serialized = serializeDocument({
    requirements: doc.requirements ?? {},
    rewards: doc.rewards ?? {},
  }) as { requirements: unknown; rewards: unknown };
  return {
    mongo_id: documentRowKey(doc),
    name: String(doc.name ?? ""),
    league_type: String(doc.type ?? "bronze"),
    description:
      doc.description == null || doc.description === undefined
        ? null
        : String(doc.description),
    requirements: serialized.requirements ?? {},
    rewards: serialized.rewards ?? {},
    is_active: doc.isActive !== false,
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

export function leaguesFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  const entries = Object.entries(filter);
  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of entries) {
    if (k.startsWith("$")) return null;
    if (k === "_id") {
      const hex = objectIdLikeToHex(v);
      if (hex) {
        parts.push(`mongo_id = $${paramIndex++}`);
        params.push(hex);
      } else if (typeof v === "string") {
        parts.push(`mongo_id = $${paramIndex++}`);
        params.push(v);
      } else {
        return null;
      }
    } else if (k === "type" && typeof v === "string") {
      parts.push(`league_type = $${paramIndex++}`);
      params.push(v);
    } else if (k === "isActive" && typeof v === "boolean") {
      parts.push(`is_active = $${paramIndex++}`);
      params.push(v);
    } else {
      return null;
    }
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

/** Postgres-backed `leagues` collection. */
export class PgLeaguesCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "leagues";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${LEAGUE_COLUMNS} FROM public.leagues ORDER BY mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.leagues`;
    return rows[0]?.c ?? 0;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const sqlParts = leaguesFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.leagues WHERE ${sqlParts.clause}`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = leaguesFilterToSql(filter);
    const needsWideScan = sqlParts == null || sqlParts.clause === "true";

    if (needsWideScan) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan leagues with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${LEAGUE_COLUMNS} FROM public.leagues WHERE ${sqlParts.clause} ORDER BY mongo_id`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows);
    }

    const rows = await this.sql.unsafe(
      `SELECT ${LEAGUE_COLUMNS} FROM public.leagues ORDER BY mongo_id`,
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
    const row = leagueDocToRow(doc as AppDoc, new Date());
    try {
      await this.sql`
        INSERT INTO public.leagues (
          mongo_id,
          name,
          league_type,
          description,
          requirements,
          rewards,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.name},
          ${row.league_type},
          ${row.description},
          ${this.sql.json(row.requirements as never)},
          ${this.sql.json(row.rewards as never)},
          ${row.is_active},
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
      const row = leagueDocToRow(next, now);
      await this.sql`
        UPDATE public.leagues
        SET
          name = ${row.name},
          league_type = ${row.league_type},
          description = ${row.description},
          requirements = ${this.sql.json(row.requirements as never)},
          rewards = ${this.sql.json(row.rewards as never)},
          is_active = ${row.is_active},
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
