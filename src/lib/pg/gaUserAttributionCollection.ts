import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import {
  objectIdLikeToHex,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type GaUserAttributionRow = {
  user_id: string;
  legacy_mongo_id: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  created_at: Date;
  updated_at: Date;
};

const GA_USER_ATTRIBUTION_COLUMNS = `
  user_id,
  legacy_mongo_id,
  source,
  medium,
  campaign,
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

function nullableString(value: unknown): string | null {
  if (value == null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function rowIdToDocId(mongoId: string | null, userId: string): ObjectId | string {
  if (mongoId && OID_HEX.test(mongoId)) return new ObjectId(mongoId);
  return mongoId ?? userId;
}

function gaUserAttributionRowToDoc(row: GaUserAttributionRow): AppDoc {
  return {
    _id: rowIdToDocId(row.legacy_mongo_id, row.user_id),
    userId: row.user_id,
    source: row.source ?? undefined,
    medium: row.medium ?? undefined,
    campaign: row.campaign ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(gaUserAttributionRowToDoc(r as GaUserAttributionRow) as T);
  }
  return out;
}

function gaUserAttributionDocToRow(doc: AppDoc, updatedAt: Date): GaUserAttributionRow {
  const legacyHex = objectIdLikeToHex(doc._id);
  const created = asDate(doc.createdAt, updatedAt);
  return {
    user_id: String(doc.userId ?? "").trim(),
    legacy_mongo_id: legacyHex,
    source: nullableString(doc.source),
    medium: nullableString(doc.medium),
    campaign: nullableString(doc.campaign),
    created_at: created,
    updated_at: updatedAt,
  };
}

function parseTextFilter(
  fieldSql: string,
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  if (typeof value === "string") {
    params.push(value);
    return { clause: `${fieldSql} = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (value && typeof value === "object" && !Array.isArray(value) && "$in" in value) {
    const arr = (value as { $in: unknown[] }).$in.filter(
      (v): v is string => typeof v === "string" && v.trim() !== ""
    );
    if (!arr.length) return { clause: "false", nextIndex: paramIndex };
    params.push(arr);
    return {
      clause: `${fieldSql} = ANY($${paramIndex}::text[])`,
      nextIndex: paramIndex + 1,
    };
  }
  return null;
}

/** SQL filters for `public.ga_user_attribution`. */
export function gaUserAttributionFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "userId") {
      const parsed = parseTextFilter("user_id", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "_id") {
      const hex = objectIdLikeToHex(v);
      if (!hex) return null;
      params.push(hex);
      parts.push(`legacy_mongo_id = $${paramIndex++}`);
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

/** Full table preload for mingo `$lookup` when this collection is the join target. */
export async function loadGaUserAttributionForAggregateJoin(sql: Sql): Promise<AppDoc[]> {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM public.ga_user_attribution`;
  const n = rows[0]?.c ?? 0;
  const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
  if (n > budget) {
    throw new Error(
      `ga_user_attribution $lookup preload needs ${n} rows (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
    );
  }
  const all = await sql.unsafe(
    `SELECT ${GA_USER_ATTRIBUTION_COLUMNS} FROM public.ga_user_attribution ORDER BY user_id`,
    []
  );
  return mapRowsToDocs(all);
}

/**
 * Postgres-backed `ga_user_attribution` (one row per user; replaces `app_documents` rows).
 */
export class PgGaUserAttributionCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "ga_user_attribution";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.ga_user_attribution`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = gaUserAttributionFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${GA_USER_ATTRIBUTION_COLUMNS} FROM public.ga_user_attribution WHERE ${sqlParts.clause} ORDER BY updated_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan ga_user_attribution with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${GA_USER_ATTRIBUTION_COLUMNS} FROM public.ga_user_attribution ORDER BY updated_at DESC`,
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
    const sqlParts = gaUserAttributionFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.ga_user_attribution WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
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
        const row = gaUserAttributionDocToRow(next, new Date());
        if (!row.user_id) {
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        }
        const { mongoId } = prepareInsertDocument(next);
        row.legacy_mongo_id = row.legacy_mongo_id ?? mongoId;
        const inserted = await this.sql`
          INSERT INTO public.ga_user_attribution (
            user_id,
            legacy_mongo_id,
            source,
            medium,
            campaign,
            created_at,
            updated_at
          )
          VALUES (
            ${row.user_id},
            ${row.legacy_mongo_id},
            ${row.source},
            ${row.medium},
            ${row.campaign},
            ${row.created_at},
            ${row.updated_at}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            legacy_mongo_id = COALESCE(
              public.ga_user_attribution.legacy_mongo_id,
              EXCLUDED.legacy_mongo_id
            ),
            source = EXCLUDED.source,
            medium = EXCLUDED.medium,
            campaign = EXCLUDED.campaign,
            updated_at = EXCLUDED.updated_at
          RETURNING user_id
        `;
        return {
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: inserted.length > 0 ? 1 : 0,
        };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const targets = many ? matches : [matches[0]!];
    let modified = 0;
    const now = new Date();
    for (const doc of targets) {
      const next = cloneDoc(doc);
      runMingoUpdate(next, update);
      const row = gaUserAttributionDocToRow(next, now);
      await this.sql`
        UPDATE public.ga_user_attribution
        SET
          source = ${row.source},
          medium = ${row.medium},
          campaign = ${row.campaign},
          updated_at = ${now}
        WHERE user_id = ${row.user_id}
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

  async bulkWrite(
    ops: {
      updateOne?: {
        filter: Record<string, unknown>;
        update: Record<string, unknown>;
        upsert?: boolean;
      };
    }[]
  ): Promise<{ ok: number; insertedCount: number; matchedCount: number; modifiedCount: number }> {
    let matched = 0;
    let modified = 0;
    let inserted = 0;
    for (const op of ops) {
      if (op.updateOne) {
        const { filter, update, upsert } = op.updateOne;
        const r = await this.updateOne(filter, update, { upsert: upsert === true });
        matched += r.matchedCount;
        modified += r.modifiedCount;
        inserted += r.upsertedCount;
      }
    }
    return { ok: 1, insertedCount: inserted, matchedCount: matched, modifiedCount: modified };
  }
}
