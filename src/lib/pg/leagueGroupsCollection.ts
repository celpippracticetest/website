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
import { PgAggregateCursor, PgFindCursor } from "./pgCollection";

type LeagueGroupRow = {
  mongo_id: string;
  league_id: string;
  group_number: number;
  season_id: string;
  start_date: Date;
  end_date: Date;
  status: string;
  max_users: number;
  users: unknown;
  created_at: Date;
  updated_at: Date;
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

function leagueGroupRowToDoc(row: LeagueGroupRow): AppDoc {
  const usersRaw = EJSON.deserialize(row.users ?? []);
  const users = Array.isArray(usersRaw) ? usersRaw : [];
  return {
    _id: new ObjectId(row.mongo_id),
    leagueId: new ObjectId(row.league_id),
    groupNumber: row.group_number,
    seasonId: row.season_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    maxUsers: row.max_users,
    users,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(leagueGroupRowToDoc(r as LeagueGroupRow) as T);
  }
  return out;
}

function leagueGroupDocToRow(doc: AppDoc, updatedAt: Date): LeagueGroupRow {
  const mongoId = documentRowKey(doc);
  const leagueId = objectIdLikeToHex(doc.leagueId);
  if (!leagueId) {
    throw new Error(`league_groups.leagueId is required (mongo_id=${mongoId})`);
  }
  const now = updatedAt;
  const usersSerialized = serializeDocument({ users: doc.users ?? [] }) as {
    users: unknown;
  };
  return {
    mongo_id: mongoId,
    league_id: leagueId,
    group_number: Number(doc.groupNumber ?? 0),
    season_id: String(doc.seasonId ?? ""),
    start_date: asDate(doc.startDate, now),
    end_date: asDate(doc.endDate, now),
    status: String(doc.status ?? "active"),
    max_users: Number(doc.maxUsers ?? 10),
    users: usersSerialized.users ?? [],
    created_at: asDate(doc.createdAt, now),
    updated_at: now,
  };
}

/** SQL for simple league_groups filters (no app_documents `collection` column). */
export function leagueGroupFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  const entries = Object.entries(filter);

  if (entries.length > 1) {
    const parts: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    for (const [k, v] of entries) {
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
          for (const item of $in) {
            const h = objectIdLikeToHex(item);
            if (!h) return null;
            hexes.push(h);
          }
          parts.push(`mongo_id = ANY($${paramIndex++}::text[])`);
          params.push(hexes);
        } else {
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
        }
      } else if (k === "seasonId" && typeof v === "string") {
        parts.push(`season_id = $${paramIndex++}`);
        params.push(v);
      } else if (k === "status" && typeof v === "string") {
        parts.push(`status = $${paramIndex++}`);
        params.push(v);
      } else if (k === "users.userId" && typeof v === "string") {
        parts.push(
          `EXISTS (SELECT 1 FROM jsonb_array_elements(users) elem WHERE elem->>'userId' = $${paramIndex++})`
        );
        params.push(v);
      } else if (
        k === "users.0" &&
        v &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        "$exists" in (v as object)
      ) {
        parts.push(`jsonb_array_length(users) > 0`);
      } else {
        return null;
      }
    }
    if (parts.length > 0) {
      return { clause: parts.join(" AND "), params };
    }
    return null;
  }

  const [k, v] = entries[0]!;

  if (k === "_id") {
    const hex = objectIdLikeToHex(v);
    if (hex) {
      return { clause: `mongo_id = $1`, params: [hex] };
    }
    if (typeof v === "string") {
      return { clause: `mongo_id = $1`, params: [v] };
    }
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
      for (const item of $in) {
        const h = objectIdLikeToHex(item);
        if (!h) return null;
        hexes.push(h);
      }
      return { clause: `mongo_id = ANY($1::text[])`, params: [hexes] };
    }
  }

  if (k === "seasonId" && typeof v === "string") {
    return { clause: `season_id = $1`, params: [v] };
  }

  if (k === "status" && typeof v === "string") {
    return { clause: `status = $1`, params: [v] };
  }

  if (k === "users.userId" && typeof v === "string") {
    return {
      clause: `EXISTS (SELECT 1 FROM jsonb_array_elements(users) elem WHERE elem->>'userId' = $1)`,
      params: [v],
    };
  }

  return null;
}

function isPgUniqueViolation(e: unknown): boolean {
  return Boolean(
    e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
  );
}

const LEAGUE_GROUP_COLUMNS = `
  mongo_id,
  league_id,
  group_number,
  season_id,
  start_date,
  end_date,
  status,
  max_users,
  users,
  created_at,
  updated_at
`;

/**
 * Postgres-backed `league_groups` collection (replaces `app_documents` rows).
 * Exposes the same surface as `PgCollection` for league repositories and routes.
 */
export class PgLeagueGroupsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "league_groups";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${LEAGUE_GROUP_COLUMNS} FROM public.league_groups ORDER BY mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.league_groups`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = leagueGroupFilterToSql(filter);
    const needsWideScan = sqlParts == null || sqlParts.clause === "true";

    if (needsWideScan) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan league_groups with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${LEAGUE_GROUP_COLUMNS} FROM public.league_groups WHERE ${sqlParts.clause} ORDER BY mongo_id`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows);
    }

    const rows = await this.sql.unsafe(
      `SELECT ${LEAGUE_GROUP_COLUMNS} FROM public.league_groups ORDER BY mongo_id`,
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
    const row = leagueGroupDocToRow(doc as AppDoc, new Date());
    try {
      await this.sql`
        INSERT INTO public.league_groups (
          mongo_id,
          league_id,
          group_number,
          season_id,
          start_date,
          end_date,
          status,
          max_users,
          users,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.league_id},
          ${row.group_number},
          ${row.season_id},
          ${row.start_date},
          ${row.end_date},
          ${row.status},
          ${row.max_users},
          ${this.sql.json(row.users as never)},
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
      const row = leagueGroupDocToRow(next, now);
      await this.sql`
        UPDATE public.league_groups
        SET
          league_id = ${row.league_id},
          group_number = ${row.group_number},
          season_id = ${row.season_id},
          start_date = ${row.start_date},
          end_date = ${row.end_date},
          status = ${row.status},
          max_users = ${row.max_users},
          users = ${this.sql.json(row.users as never)},
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

  aggregate(pipeline: object[], _options?: { allowDiskUse?: boolean }): PgAggregateCursor {
    return new PgAggregateCursor(async () => {
      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on league_groups needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${LEAGUE_GROUP_COLUMNS} FROM public.league_groups ORDER BY mongo_id`,
        []
      );
      const docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
