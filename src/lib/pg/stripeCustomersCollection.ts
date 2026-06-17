import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import type { AppDoc } from "./document";
import type { SqlParts } from "./whereBuilder";
import { bindUnsafeParams } from "./bindUnsafeParams";
import { PgFindCursor } from "./pgCollection";

type StripeCustomerRow = {
  stripe_id: string;
  email: string | null;
  created_at: Date;
  delinquent: boolean;
  metadata: unknown;
  updated_at: Date;
};

const STRIPE_CUSTOMER_COLUMNS = `
  stripe_id,
  email,
  created_at,
  delinquent,
  metadata,
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
      v === null
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

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function stripeCustomerRowToDoc(row: StripeCustomerRow): AppDoc {
  const metadataRaw = EJSON.deserialize(row.metadata ?? {});
  return {
    _id: row.stripe_id,
    stripeId: row.stripe_id,
    email: row.email,
    createdAt: row.created_at,
    delinquent: row.delinquent,
    metadata:
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? metadataRaw
        : {},
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(stripeCustomerRowToDoc(r as StripeCustomerRow) as T);
  }
  return out;
}

function stripeCustomerDocToRow(doc: AppDoc, updatedAt: Date): StripeCustomerRow {
  const stripeId = String(doc.stripeId ?? doc._id ?? "");
  const metadataSerialized = serializeDocument({
    metadata: doc.metadata ?? {},
  }) as { metadata: unknown };
  return {
    stripe_id: stripeId,
    email:
      doc.email == null || doc.email === undefined ? null : String(doc.email).trim() || null,
    created_at: asDate(doc.createdAt, updatedAt),
    delinquent: asBool(doc.delinquent, false),
    metadata: metadataSerialized.metadata ?? {},
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

/** SQL filters for `public.stripe_customers`. */
export function stripeCustomersFilterToSql(
  filter: Record<string, unknown>
): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if ("$expr" in filter || "$and" in filter || "$or" in filter) {
    return null;
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "stripeId" && typeof v === "string") {
      parts.push(`stripe_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "createdAt" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("created_at", op, val, paramIndex, params);
        if (!parsed) return null;
        parts.push(parsed.clause);
        paramIndex = parsed.nextIndex;
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
 * Postgres-backed `stripe_customers` reporting cache (replaces `app_documents` rows).
 */
export class PgStripeCustomersCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "stripe_customers";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.stripe_customers`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = stripeCustomersFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${STRIPE_CUSTOMER_COLUMNS} FROM public.stripe_customers WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan stripe_customers with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${STRIPE_CUSTOMER_COLUMNS} FROM public.stripe_customers ORDER BY created_at DESC`,
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
    const sqlParts = stripeCustomersFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.stripe_customers WHERE ${sqlParts.clause}`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: string;
  }> {
    const d = doc as AppDoc;
    if (!d.stripeId && typeof d._id === "string") {
      d.stripeId = d._id;
    }
    const row = stripeCustomerDocToRow(d, new Date());
    try {
      await this.sql`
        INSERT INTO public.stripe_customers (
          stripe_id,
          email,
          created_at,
          delinquent,
          metadata,
          updated_at
        )
        VALUES (
          ${row.stripe_id},
          ${row.email},
          ${row.created_at},
          ${row.delinquent},
          ${this.sql.json(row.metadata as never)},
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
    return { acknowledged: true, insertedId: row.stripe_id };
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
      const row = stripeCustomerDocToRow(next, now);
      await this.sql`
        UPDATE public.stripe_customers
        SET
          email = ${row.email},
          created_at = ${row.created_at},
          delinquent = ${row.delinquent},
          metadata = ${this.sql.json(row.metadata as never)},
          updated_at = ${now}
        WHERE stripe_id = ${row.stripe_id}
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

  async createIndex(
    _spec: Record<string, 1 | -1>,
    _options?: { unique?: boolean; name?: string }
  ): Promise<string> {
    return "noop_pg_stripe_customers_index";
  }
}
