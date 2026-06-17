import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query } from "mingo";
import type { Sql } from "postgres";
import {
  objectIdLikeToHex,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { bindUnsafeParams } from "./bindUnsafeParams";
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type ReferralCodeRow = {
  user_id: string;
  code: string;
  legacy_mongo_id: string | null;
  created_at: Date;
  updated_at: Date;
};

const REFERRAL_CODE_COLUMNS = `
  user_id,
  code,
  legacy_mongo_id,
  created_at,
  updated_at
`;

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

function referralCodeRowToDoc(row: ReferralCodeRow): AppDoc {
  return {
    _id: rowIdToDocId(row.legacy_mongo_id, row.user_id),
    userId: row.user_id,
    code: row.code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(referralCodeRowToDoc(r as ReferralCodeRow) as T);
  }
  return out;
}

function referralCodeDocToRow(doc: AppDoc, updatedAt: Date): ReferralCodeRow {
  const userId = String(doc.userId ?? "").trim();
  const code = String(doc.code ?? "").trim();
  if (!userId) {
    throw new Error("referralCodes requires userId");
  }
  if (!code) {
    throw new Error("referralCodes requires code");
  }
  return {
    user_id: userId,
    code,
    legacy_mongo_id: objectIdLikeToHex(doc._id),
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.referral_codes`. */
export function referralCodesFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "code" && typeof v === "string") {
      parts.push(`code = $${paramIndex++}`);
      params.push(v.trim());
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
 * Postgres-backed `referralCodes` (one row per user; replaces `app_documents` rows).
 */
export class PgReferralCodesCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "referralCodes";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.referral_codes`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = referralCodesFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${REFERRAL_CODE_COLUMNS} FROM public.referral_codes WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan referral_codes with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${REFERRAL_CODE_COLUMNS} FROM public.referral_codes ORDER BY created_at DESC`,
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
    if (!d._id) d._id = new ObjectId(mongoId);
    const row = referralCodeDocToRow(d, new Date());
    row.legacy_mongo_id = row.legacy_mongo_id ?? mongoId;
    try {
      await this.sql`
        INSERT INTO public.referral_codes (
          user_id,
          code,
          legacy_mongo_id,
          created_at,
          updated_at
        )
        VALUES (
          ${row.user_id},
          ${row.code},
          ${row.legacy_mongo_id},
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

  async deleteOne(filter: Record<string, unknown>): Promise<{
    acknowledged: boolean;
    deletedCount: number;
  }> {
    const sqlParts = referralCodesFilterToSql(filter);
    if (!sqlParts || sqlParts.clause === "true") {
      const found = await this.findOne(filter);
      if (!found) return { acknowledged: true, deletedCount: 0 };
      const userId = String(found.userId ?? "");
      if (!userId) return { acknowledged: true, deletedCount: 0 };
      const rows = await this.sql`
        DELETE FROM public.referral_codes WHERE user_id = ${userId} RETURNING user_id
      `;
      return { acknowledged: true, deletedCount: rows.length > 0 ? 1 : 0 };
    }
    const rows = await this.sql.unsafe(
      `DELETE FROM public.referral_codes WHERE ${sqlParts.clause} RETURNING user_id`,
      bindUnsafeParams(this.sql, sqlParts.params) as never[]
    );
    return { acknowledged: true, deletedCount: rows.length };
  }

  async createIndex(
    _spec: Record<string, 1 | -1>,
    _options?: { unique?: boolean; name?: string }
  ): Promise<string> {
    return "noop_pg_referral_codes_index";
  }
}
