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

type UserLeaguePointsRow = {
  mongo_id: string;
  user_id: string;
  season_id: string;
  league_id: string | null;
  group_id: string | null;
  total_points: number;
  overall_points: number;
  status: string | null;
  points_breakdown: unknown;
  tasks_completed: unknown;
  last_season_result: unknown | null;
  last_activity_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const USER_LEAGUE_POINTS_COLUMNS = `
  mongo_id,
  user_id,
  season_id,
  league_id,
  group_id,
  total_points,
  overall_points,
  status,
  points_breakdown,
  tasks_completed,
  last_season_result,
  last_activity_at,
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

function userLeaguePointsRowToDoc(row: UserLeaguePointsRow): AppDoc {
  const pointsBreakdown = EJSON.deserialize(row.points_breakdown ?? {});
  const tasksRaw = EJSON.deserialize(row.tasks_completed ?? []);
  const tasksCompleted = Array.isArray(tasksRaw) ? tasksRaw : [];
  const lastSeasonResult =
    row.last_season_result == null ? undefined : EJSON.deserialize(row.last_season_result);

  return {
    _id: rowIdToDocId(row.mongo_id),
    userId: row.user_id,
    seasonId: row.season_id,
    leagueId: row.league_id ? new ObjectId(row.league_id) : null,
    groupId: row.group_id ? new ObjectId(row.group_id) : null,
    totalPoints: row.total_points,
    overallPoints: row.overall_points,
    status: row.status ?? undefined,
    pointsBreakdown:
      pointsBreakdown && typeof pointsBreakdown === "object" && !Array.isArray(pointsBreakdown)
        ? pointsBreakdown
        : {},
    tasksCompleted,
    ...(lastSeasonResult !== undefined && lastSeasonResult !== null
      ? { lastSeasonResult }
      : {}),
    lastActivityAt: row.last_activity_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userLeaguePointsRowToDoc(r as UserLeaguePointsRow) as T);
  }
  return out;
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return fallback;
}

function userLeaguePointsDocToRow(doc: AppDoc, updatedAt: Date): UserLeaguePointsRow {
  const mongoId = documentRowKey(doc);
  const serialized = serializeDocument({
    pointsBreakdown: doc.pointsBreakdown ?? {},
    tasksCompleted: doc.tasksCompleted ?? [],
    lastSeasonResult: doc.lastSeasonResult ?? null,
  }) as {
    pointsBreakdown: unknown;
    tasksCompleted: unknown;
    lastSeasonResult: unknown;
  };

  return {
    mongo_id: mongoId,
    user_id: String(doc.userId ?? ""),
    season_id: String(doc.seasonId ?? ""),
    league_id: objectIdLikeToHex(doc.leagueId),
    group_id: objectIdLikeToHex(doc.groupId),
    total_points: toInt(doc.totalPoints, 0),
    overall_points: toInt(doc.overallPoints, 0),
    status:
      doc.status === null || doc.status === undefined ? null : String(doc.status),
    points_breakdown: serialized.pointsBreakdown ?? {},
    tasks_completed: serialized.tasksCompleted ?? [],
    last_season_result:
      serialized.lastSeasonResult === null || serialized.lastSeasonResult === undefined
        ? null
        : serialized.lastSeasonResult,
    last_activity_at:
      doc.lastActivityAt == null ? null : asDate(doc.lastActivityAt, updatedAt),
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

function filterFieldToSql(
  field: string,
  column: string,
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  if (field === "_id") {
    const hex = objectIdLikeToHex(value);
    if (hex) {
      params.push(hex);
      return { clause: `mongo_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
    if (typeof value === "string") {
      params.push(value);
      return { clause: `mongo_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
    return null;
  }

  if (field === "userId" && typeof value === "string") {
    params.push(value);
    return { clause: `user_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }

  if (field === "seasonId" && typeof value === "string") {
    params.push(value);
    return { clause: `season_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }

  if (field === "status" && typeof value === "string") {
    params.push(value);
    return { clause: `status = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }

  if (field === "leagueId" || field === "groupId") {
    const hex = objectIdLikeToHex(value);
    if (hex) {
      params.push(hex);
      return { clause: `${column} = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
    if (value === null) {
      return { clause: `${column} IS NULL`, nextIndex: paramIndex };
    }
  }

  return null;
}

/** SQL filters for `public.user_league_points` (replaces app_documents body scans). */
export function userLeaguePointsFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if (Object.keys(filter).length === 1 && "$or" in filter) {
    return null;
  }

  const entries = Object.entries(filter);

  if (entries.length === 1) {
    const [k, v] = entries[0]!;
    if (
      k === "_id" &&
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
    const column = k === "leagueId" ? "league_id" : k === "groupId" ? "group_id" : k;
    const params: unknown[] = [];
    const parsed = filterFieldToSql(k, column, v, 1, params);
    if (parsed) {
      return { clause: parsed.clause, params };
    }
    return null;
  }

  if (entries.length > 1) {
    const parts: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    for (const [k, v] of entries) {
      if (!k || k.startsWith("$")) return null;
      const column = k === "leagueId" ? "league_id" : k === "groupId" ? "group_id" : k;
      const parsed = filterFieldToSql(k, column, v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    }
    if (parts.length > 0) {
      return { clause: parts.join(" AND "), params };
    }
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

/**
 * Postgres-backed `user_league_points` collection (replaces `app_documents` rows).
 */
export class PgUserLeaguePointsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "user_league_points";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${USER_LEAGUE_POINTS_COLUMNS} FROM public.user_league_points ORDER BY mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.user_league_points`;
    return rows[0]?.c ?? 0;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const sqlParts = userLeaguePointsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.user_league_points WHERE ${sqlParts.clause}`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userLeaguePointsFilterToSql(filter);
    const needsWideScan = sqlParts == null || sqlParts.clause === "true";

    if (needsWideScan) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan user_league_points with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_LEAGUE_POINTS_COLUMNS} FROM public.user_league_points WHERE ${sqlParts.clause} ORDER BY mongo_id`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows);
    }

    const rows = await this.sql.unsafe(
      `SELECT ${USER_LEAGUE_POINTS_COLUMNS} FROM public.user_league_points ORDER BY mongo_id`,
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
    const d = doc as AppDoc;
    if (d.leagueId != null) {
      const hex = objectIdLikeToHex(d.leagueId);
      if (hex) d.leagueId = new ObjectId(hex);
    }
    if (d.groupId != null) {
      const hex = objectIdLikeToHex(d.groupId);
      if (hex) d.groupId = new ObjectId(hex);
    }
    const row = userLeaguePointsDocToRow(d, new Date());
    try {
      await this.sql`
        INSERT INTO public.user_league_points (
          mongo_id,
          user_id,
          season_id,
          league_id,
          group_id,
          total_points,
          overall_points,
          status,
          points_breakdown,
          tasks_completed,
          last_season_result,
          last_activity_at,
          created_at,
          updated_at
        )
        VALUES (
          ${mongoId},
          ${row.user_id},
          ${row.season_id},
          ${row.league_id},
          ${row.group_id},
          ${row.total_points},
          ${row.overall_points},
          ${row.status},
          ${this.sql.json(row.points_breakdown as never)},
          ${this.sql.json(row.tasks_completed as never)},
          ${row.last_season_result != null ? this.sql.json(row.last_season_result as never) : null},
          ${row.last_activity_at},
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
      if (next.leagueId != null) {
        const hex = objectIdLikeToHex(next.leagueId);
        next.leagueId = hex ? new ObjectId(hex) : null;
      }
      if (next.groupId != null) {
        const hex = objectIdLikeToHex(next.groupId);
        next.groupId = hex ? new ObjectId(hex) : null;
      } else if ("groupId" in update && (update as { $set?: { groupId?: unknown } }).$set?.groupId === null) {
        next.groupId = null;
      }
      const row = userLeaguePointsDocToRow(next, now);
      await this.sql`
        UPDATE public.user_league_points
        SET
          user_id = ${row.user_id},
          season_id = ${row.season_id},
          league_id = ${row.league_id},
          group_id = ${row.group_id},
          total_points = ${row.total_points},
          overall_points = ${row.overall_points},
          status = ${row.status},
          points_breakdown = ${this.sql.json(row.points_breakdown as never)},
          tasks_completed = ${this.sql.json(row.tasks_completed as never)},
          last_season_result = ${
            row.last_season_result != null ? this.sql.json(row.last_season_result as never) : null
          },
          last_activity_at = ${row.last_activity_at},
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
      const first = pipeline[0];
      const match =
        first && typeof first === "object" && "$match" in (first as object)
          ? ((first as { $match: Record<string, unknown> }).$match ?? null)
          : null;

      let docs: AppDoc[];
      if (match) {
        const sqlParts = userLeaguePointsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${USER_LEAGUE_POINTS_COLUMNS} FROM public.user_league_points WHERE ${sqlParts.clause} ORDER BY mongo_id`,
            bindUnsafeParams(this.sql, sqlParts.params) as never[]
          );
          docs = mapRowsToDocs(rows);
          return mingoAggregate(docs, pipeline as never[], {
            collectionResolver: () => [],
          });
        }
      }

      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on user_league_points needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${USER_LEAGUE_POINTS_COLUMNS} FROM public.user_league_points ORDER BY mongo_id`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
