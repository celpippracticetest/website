import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import {
  objectIdLikeToHex,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type AbandonedCartEmailConfigRow = {
  config_key: string;
  legacy_mongo_id: string | null;
  config: unknown;
  created_at: Date;
  updated_at: Date;
};

const ABANDONED_CART_EMAIL_CONFIG_COLUMNS = `
  config_key,
  legacy_mongo_id,
  config,
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

function rowIdToDocId(mongoId: string | null, configKey: string): ObjectId | string {
  if (mongoId && OID_HEX.test(mongoId)) return new ObjectId(mongoId);
  return mongoId ?? configKey;
}

function abandonedCartEmailConfigRowToDoc(row: AbandonedCartEmailConfigRow): AppDoc {
  const configRaw = EJSON.deserialize(row.config ?? { stages: [] });
  return {
    _id: rowIdToDocId(row.legacy_mongo_id, row.config_key),
    configKey: row.config_key,
    config:
      configRaw && typeof configRaw === "object" && !Array.isArray(configRaw)
        ? configRaw
        : { stages: [] },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(abandonedCartEmailConfigRowToDoc(r as AbandonedCartEmailConfigRow) as T);
  }
  return out;
}

function abandonedCartEmailConfigDocToRow(
  doc: AppDoc,
  updatedAt: Date
): AbandonedCartEmailConfigRow {
  const legacyHex = objectIdLikeToHex(doc._id);
  const configSerialized = serializeDocument({
    config: doc.config ?? { stages: [] },
  }) as { config: unknown };
  return {
    config_key: String(doc.configKey ?? "default"),
    legacy_mongo_id: legacyHex,
    config: configSerialized.config ?? { stages: [] },
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.abandoned_cart_email_configs`. */
export function abandonedCartEmailConfigsFilterToSql(
  filter: Record<string, unknown>
): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "configKey" && typeof v === "string") {
      parts.push(`config_key = $${paramIndex++}`);
      params.push(v);
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

/**
 * Postgres-backed `abandonedCartEmailConfigs` (one row per config_key; replaces `app_documents`).
 */
export class PgAbandonedCartEmailConfigsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "abandonedCartEmailConfigs";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.abandoned_cart_email_configs`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = abandonedCartEmailConfigsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${ABANDONED_CART_EMAIL_CONFIG_COLUMNS} FROM public.abandoned_cart_email_configs WHERE ${sqlParts.clause} ORDER BY updated_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan abandoned_cart_email_configs with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${ABANDONED_CART_EMAIL_CONFIG_COLUMNS} FROM public.abandoned_cart_email_configs ORDER BY updated_at DESC`,
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

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const d = doc as AppDoc;
    if (!d.configKey) {
      throw new Error("abandonedCartEmailConfigs requires configKey");
    }
    const row = abandonedCartEmailConfigDocToRow(d, new Date());
    if (!row.legacy_mongo_id) {
      row.legacy_mongo_id = mongoId;
    }
    try {
      await this.sql`
        INSERT INTO public.abandoned_cart_email_configs (
          config_key,
          legacy_mongo_id,
          config,
          created_at,
          updated_at
        )
        VALUES (
          ${row.config_key},
          ${row.legacy_mongo_id},
          ${this.sql.json(row.config as never)},
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
        const row = abandonedCartEmailConfigDocToRow(next, new Date());
        if (!row.config_key) {
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        }
        const { mongoId } = prepareInsertDocument(next);
        row.legacy_mongo_id = row.legacy_mongo_id ?? mongoId;
        const inserted = await this.sql`
          INSERT INTO public.abandoned_cart_email_configs (
            config_key,
            legacy_mongo_id,
            config,
            created_at,
            updated_at
          )
          VALUES (
            ${row.config_key},
            ${row.legacy_mongo_id},
            ${this.sql.json(row.config as never)},
            ${row.created_at},
            ${row.updated_at}
          )
          ON CONFLICT (config_key) DO NOTHING
          RETURNING config_key
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
      const row = abandonedCartEmailConfigDocToRow(next, now);
      await this.sql`
        UPDATE public.abandoned_cart_email_configs
        SET
          config = ${this.sql.json(row.config as never)},
          updated_at = ${now}
        WHERE config_key = ${row.config_key}
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

  async createIndex(
    _spec: Record<string, 1 | -1>,
    _options?: { unique?: boolean; name?: string }
  ): Promise<string> {
    return "noop_pg_abandoned_cart_email_configs_index";
  }
}
