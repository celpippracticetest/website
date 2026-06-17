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

type AccountAccessSignalsRow = {
  user_id: string;
  legacy_mongo_id: string | null;
  country_last_seen: unknown;
  recent_networks: unknown;
  created_at: Date;
  updated_at: Date;
};

const ACCOUNT_ACCESS_SIGNALS_COLUMNS = `
  user_id,
  legacy_mongo_id,
  country_last_seen,
  recent_networks,
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

function rowIdToDocId(mongoId: string | null, userId: string): ObjectId | string {
  if (mongoId && OID_HEX.test(mongoId)) return new ObjectId(mongoId);
  return mongoId ?? userId;
}

function accountAccessSignalsRowToDoc(row: AccountAccessSignalsRow): AppDoc {
  const countryRaw = EJSON.deserialize(row.country_last_seen ?? {});
  const networksRaw = EJSON.deserialize(row.recent_networks ?? []);
  return {
    _id: rowIdToDocId(row.legacy_mongo_id, row.user_id),
    userId: row.user_id,
    countryLastSeen:
      countryRaw && typeof countryRaw === "object" && !Array.isArray(countryRaw)
        ? countryRaw
        : {},
    recentNetworks: Array.isArray(networksRaw) ? networksRaw : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(accountAccessSignalsRowToDoc(r as AccountAccessSignalsRow) as T);
  }
  return out;
}

function accountAccessSignalsDocToRow(doc: AppDoc, updatedAt: Date): AccountAccessSignalsRow {
  const legacyHex = objectIdLikeToHex(doc._id);
  const countrySerialized = serializeDocument({
    countryLastSeen: doc.countryLastSeen ?? {},
  }) as { countryLastSeen: unknown };
  const networksSerialized = serializeDocument({
    recentNetworks: doc.recentNetworks ?? [],
  }) as { recentNetworks: unknown };
  return {
    user_id: String(doc.userId ?? ""),
    legacy_mongo_id: legacyHex,
    country_last_seen: countrySerialized.countryLastSeen ?? {},
    recent_networks: networksSerialized.recentNetworks ?? [],
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.account_access_signals`. */
export function accountAccessSignalsFilterToSql(
  filter: Record<string, unknown>
): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  const entries = Object.entries(filter);
  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of entries) {
    if (k.startsWith("$")) return null;
    if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "_id") {
      if (v && typeof v === "object" && !Array.isArray(v) && "$in" in v) {
        const $in = (v as { $in: unknown[] }).$in;
        const hexes: string[] = [];
        for (const item of $in) {
          const h = objectIdLikeToHex(item);
          if (h) hexes.push(h);
        }
        if (!hexes.length) return { clause: "false", params: [] };
        params.push(hexes);
        parts.push(`legacy_mongo_id = ANY($${paramIndex++}::text[])`);
      } else {
        const hex = objectIdLikeToHex(v);
        if (!hex) return null;
        params.push(hex);
        parts.push(`legacy_mongo_id = $${paramIndex++}`);
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

/**
 * Postgres-backed `account_access_signals` (one row per user; replaces `app_documents`).
 */
export class PgAccountAccessSignalsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "account_access_signals";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.account_access_signals`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = accountAccessSignalsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${ACCOUNT_ACCESS_SIGNALS_COLUMNS} FROM public.account_access_signals WHERE ${sqlParts.clause} ORDER BY updated_at DESC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan account_access_signals with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${ACCOUNT_ACCESS_SIGNALS_COLUMNS} FROM public.account_access_signals ORDER BY updated_at DESC`,
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
    const sqlParts = accountAccessSignalsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.account_access_signals WHERE ${sqlParts.clause}`,
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
    const d = doc as AppDoc;
    if (!d.userId) {
      throw new Error("account_access_signals requires userId");
    }
    const row = accountAccessSignalsDocToRow(d, new Date());
    if (!row.legacy_mongo_id) {
      row.legacy_mongo_id = mongoId;
    }
    try {
      await this.sql`
        INSERT INTO public.account_access_signals (
          user_id,
          legacy_mongo_id,
          country_last_seen,
          recent_networks,
          created_at,
          updated_at
        )
        VALUES (
          ${row.user_id},
          ${row.legacy_mongo_id},
          ${this.sql.json(row.country_last_seen as never)},
          ${this.sql.json(row.recent_networks as never)},
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
  ): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
    upsertedCount: number;
  }> {
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
        const row = accountAccessSignalsDocToRow(next, new Date());
        if (!row.user_id) {
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        }
        const { mongoId } = prepareInsertDocument(next);
        row.legacy_mongo_id = row.legacy_mongo_id ?? mongoId;
        const inserted = await this.sql`
          INSERT INTO public.account_access_signals (
            user_id,
            legacy_mongo_id,
            country_last_seen,
            recent_networks,
            created_at,
            updated_at
          )
          VALUES (
            ${row.user_id},
            ${row.legacy_mongo_id},
            ${this.sql.json(row.country_last_seen as never)},
            ${this.sql.json(row.recent_networks as never)},
            ${row.created_at},
            ${row.updated_at}
          )
          ON CONFLICT (user_id) DO NOTHING
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
      const row = accountAccessSignalsDocToRow(next, now);
      await this.sql`
        UPDATE public.account_access_signals
        SET
          country_last_seen = ${this.sql.json(row.country_last_seen as never)},
          recent_networks = ${this.sql.json(row.recent_networks as never)},
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

  async deleteMany(
    filter: Record<string, unknown>
  ): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const sqlParts = accountAccessSignalsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `DELETE FROM public.account_access_signals WHERE ${sqlParts.clause} RETURNING user_id`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return { acknowledged: true, deletedCount: rows.length };
    }

    const matches = await this.findDocuments(filter);
    let n = 0;
    for (const doc of matches) {
      try {
        const key = documentRowKey(doc);
        const hex = objectIdLikeToHex(key);
        if (hex) {
          await this.sql`
            DELETE FROM public.account_access_signals WHERE legacy_mongo_id = ${hex}
          `;
        } else if (typeof (doc as AppDoc).userId === "string") {
          await this.sql`
            DELETE FROM public.account_access_signals
            WHERE user_id = ${String((doc as AppDoc).userId)}
          `;
        }
        n++;
      } catch {
        if (typeof (doc as AppDoc).userId === "string") {
          await this.sql`
            DELETE FROM public.account_access_signals
            WHERE user_id = ${String((doc as AppDoc).userId)}
          `;
          n++;
        }
      }
    }
    return { acknowledged: true, deletedCount: n };
  }

  async createIndex(
    _spec: Record<string, 1 | -1>,
    _options?: { unique?: boolean; name?: string }
  ): Promise<string> {
    return "noop_pg_account_access_signals_index";
  }
}
