import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import {
  documentRowKey,
  objectIdLikeToHex,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type CheckoutRow = {
  mongo_id: string;
  user_id: string;
  checkout_id: string;
  sub: string | null;
  status: string | null;
  line_items: unknown;
  created_at: Date;
};

const CHECKOUT_COLUMNS = `
  mongo_id,
  user_id,
  checkout_id,
  sub,
  status,
  line_items,
  created_at
`;

function maxScan(): number {
  return Number(process.env.APP_DOCUMENTS_MAX_SCAN || 2_000_000);
}

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

function parseMongoIdFilter(
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  const hex = objectIdLikeToHex(value);
  if (hex) {
    params.push(hex);
    return { clause: `mongo_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (typeof value === "string" && value.trim() !== "") {
    params.push(value);
    return { clause: `mongo_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  return null;
}

/** SQL filters for `public.checkouts`. */
export function checkoutsFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if ("$expr" in filter || "$and" in filter) {
    return null;
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) continue;

    if (k === "_id") {
      const parsed = parseMongoIdFilter(v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "userId") {
      const parsed = parseTextFilter("user_id", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "checkoutId") {
      const parsed = parseTextFilter("checkout_id", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "sub") {
      const parsed = parseTextFilter("sub", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "status") {
      const parsed = parseTextFilter("status", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "createdAt" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("created_at", op, val, paramIndex, params);
        if (!parsed) return null;
        parts.push(parsed.clause);
        paramIndex = parsed.nextIndex;
      }
    } else if (k === "lineItems.0.price.recurring" && v === null) {
      parts.push(`(line_items #> '{0,price,recurring}' IS NULL)`);
    } else {
      return null;
    }
  }

  if (parts.length === 0) return { clause: "true", params: [] };
  return { clause: parts.join(" AND "), params };
}

function checkoutRowToDoc(row: CheckoutRow): AppDoc {
  const lineItemsRaw = EJSON.deserialize(row.line_items ?? null);
  return {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    userId: row.user_id,
    checkoutId: row.checkout_id,
    sub: row.sub ?? undefined,
    status: row.status ?? undefined,
    lineItems: Array.isArray(lineItemsRaw) ? lineItemsRaw : lineItemsRaw ?? [],
    createdAt: row.created_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(checkoutRowToDoc(r as CheckoutRow) as T);
  }
  return out;
}

function checkoutDocToRow(doc: AppDoc, mongoId: string): CheckoutRow {
  const userId = nullableString(doc.userId);
  const checkoutId = nullableString(doc.checkoutId);
  if (!userId) {
    throw new Error("checkouts requires userId");
  }
  if (!checkoutId) {
    throw new Error("checkouts requires checkoutId");
  }
  const lineItems = doc.lineItems;
  return {
    mongo_id: mongoId,
    user_id: userId,
    checkout_id: checkoutId,
    sub: nullableString(doc.sub),
    status: nullableString(doc.status),
    line_items: Array.isArray(lineItems) ? lineItems : lineItems != null ? [lineItems] : [],
    created_at: asDate(doc.createdAt, new Date()),
  };
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
 * Postgres-backed `checkouts` collection (`public.checkouts`; replaces `app_documents` rows).
 */
export class PgCheckoutsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "checkouts";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.checkouts`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = checkoutsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${CHECKOUT_COLUMNS} FROM public.checkouts WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan checkouts with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${CHECKOUT_COLUMNS} FROM public.checkouts ORDER BY created_at DESC`,
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
    const sqlParts = checkoutsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.checkouts WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
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
    if (!d._id) d._id = new ObjectId(mongoId);
    const row = checkoutDocToRow(d, mongoId);
    const lineItems = row.line_items as unknown[];
    try {
      await this.sql`
        INSERT INTO public.checkouts (
          mongo_id,
          user_id,
          checkout_id,
          sub,
          status,
          line_items,
          created_at
        )
        VALUES (
          ${row.mongo_id},
          ${row.user_id},
          ${row.checkout_id},
          ${row.sub},
          ${row.status},
          ${this.sql.json(lineItems as never)},
          ${row.created_at}
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
        await this.insertOne(next);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const targets = many ? matches : [matches[0]!];
    let modified = 0;
    for (const doc of targets) {
      const next = cloneDoc(doc);
      runMingoUpdate(next, update);
      const row = checkoutDocToRow(next, documentRowKey(doc));
      const lineItems = row.line_items as unknown[];
      await this.sql`
        UPDATE public.checkouts
        SET
          user_id = ${row.user_id},
          checkout_id = ${row.checkout_id},
          sub = ${row.sub},
          status = ${row.status},
          line_items = ${this.sql.json(lineItems as never)},
          created_at = ${row.created_at}
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

  async findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean; returnDocument?: "before" | "after" }
  ): Promise<T | null> {
    const before = await this.findOne(filter);
    const returnAfter = options?.returnDocument !== "before";
    if (!before) {
      if (options?.upsert) {
        const seed = filterToPlainDoc(filter);
        const next = cloneDoc(seed);
        applySetOnInsert(next, update);
        runMingoUpdate(next, update);
        await this.insertOne(next);
        const created = await this.findOne(filter);
        return returnAfter ? (created as T | null) : null;
      }
      return null;
    }
    await this.updateOne({ _id: before._id }, update);
    const after = await this.findOne({ _id: before._id });
    return returnAfter ? (after as T | null) : (before as T);
  }
}
