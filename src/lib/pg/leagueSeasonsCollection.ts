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
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type LeagueSeasonRow = {
  mongo_id: string;
  season_id: string;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  status: string | null;
  ended_at: Date | null;
  leagues: unknown;
  created_at: Date;
  updated_at: Date;
};

const LEAGUE_SEASON_COLUMNS = `
  mongo_id,
  season_id,
  start_date,
  end_date,
  is_active,
  status,
  ended_at,
  leagues,
  created_at,
  updated_at
`;

type UpdateOptions = {
  upsert?: boolean;
  arrayFilters?: Record<string, unknown>[];
};

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

function runMingoUpdate(
  doc: AppDoc,
  update: Record<string, unknown>,
  arrayFilters?: Record<string, unknown>[]
): void {
  const payload = stripSetOnInsert(update);
  if (arrayFilters?.length) {
    mingoUpdate(doc, payload as never, arrayFilters as never);
  } else {
    mingoUpdate(doc, payload as never);
  }
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

function leagueSeasonRowToDoc(row: LeagueSeasonRow): AppDoc {
  const leaguesRaw = EJSON.deserialize(row.leagues ?? []);
  const leagues = Array.isArray(leaguesRaw) ? leaguesRaw : [];
  return {
    _id: rowIdToDocId(row.mongo_id),
    seasonId: row.season_id,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    status: row.status ?? undefined,
    endedAt: row.ended_at ?? undefined,
    leagues,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(leagueSeasonRowToDoc(r as LeagueSeasonRow) as T);
  }
  return out;
}

function leagueSeasonDocToRow(doc: AppDoc, updatedAt: Date): LeagueSeasonRow {
  const leaguesSerialized = serializeDocument({ leagues: doc.leagues ?? [] }) as {
    leagues: unknown;
  };
  return {
    mongo_id: documentRowKey(doc),
    season_id: String(doc.seasonId ?? ""),
    start_date: asDate(doc.startDate, updatedAt),
    end_date: asDate(doc.endDate, updatedAt),
    is_active: doc.isActive !== false,
    status:
      doc.status === null || doc.status === undefined ? null : String(doc.status),
    ended_at: doc.endedAt == null ? null : asDate(doc.endedAt, updatedAt),
    leagues: leaguesSerialized.leagues ?? [],
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

export function leagueSeasonsFilterToSql(filter: Record<string, unknown>): SqlParts | null {
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
    } else if (k === "seasonId" && typeof v === "string") {
      parts.push(`season_id = $${paramIndex++}`);
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

/** Postgres-backed `league_seasons` collection. */
export class PgLeagueSeasonsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "league_seasons";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${LEAGUE_SEASON_COLUMNS} FROM public.league_seasons ORDER BY mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.league_seasons`;
    return rows[0]?.c ?? 0;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const sqlParts = leagueSeasonsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.league_seasons WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = leagueSeasonsFilterToSql(filter);
    const needsWideScan = sqlParts == null || sqlParts.clause === "true";

    if (needsWideScan) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan league_seasons with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${LEAGUE_SEASON_COLUMNS} FROM public.league_seasons WHERE ${sqlParts.clause} ORDER BY mongo_id`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows);
    }

    const rows = await this.sql.unsafe(
      `SELECT ${LEAGUE_SEASON_COLUMNS} FROM public.league_seasons ORDER BY mongo_id`,
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
    const row = leagueSeasonDocToRow(doc as AppDoc, new Date());
    try {
      await this.sql`
        INSERT INTO public.league_seasons (
          mongo_id,
          season_id,
          start_date,
          end_date,
          is_active,
          status,
          ended_at,
          leagues,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.season_id},
          ${row.start_date},
          ${row.end_date},
          ${row.is_active},
          ${row.status},
          ${row.ended_at},
          ${this.sql.json(row.leagues as never)},
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
    options?: UpdateOptions
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number; upsertedCount: number }> {
    return this.updateManyInternal(filter, update, false, options?.upsert === true, options?.arrayFilters);
  }

  async updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Pick<UpdateOptions, "arrayFilters">
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number }> {
    const r = await this.updateManyInternal(
      filter,
      update,
      true,
      false,
      options?.arrayFilters
    );
    return { acknowledged: true, matchedCount: r.matchedCount, modifiedCount: r.modifiedCount };
  }

  private async updateManyInternal(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    many: boolean,
    upsert: boolean,
    arrayFilters?: Record<string, unknown>[]
  ): Promise<{ acknowledged: boolean; matchedCount: number; modifiedCount: number; upsertedCount: number }> {
    const matches = await this.findDocuments(filter);
    if (!matches.length) {
      if (upsert && !many) {
        const seed = filterToPlainDoc(filter);
        const next = cloneDoc(seed);
        applySetOnInsert(next, update);
        runMingoUpdate(next, update, arrayFilters);
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
      runMingoUpdate(next, update, arrayFilters);
      const row = leagueSeasonDocToRow(next, now);
      await this.sql`
        UPDATE public.league_seasons
        SET
          season_id = ${row.season_id},
          start_date = ${row.start_date},
          end_date = ${row.end_date},
          is_active = ${row.is_active},
          status = ${row.status},
          ended_at = ${row.ended_at},
          leagues = ${this.sql.json(row.leagues as never)},
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
