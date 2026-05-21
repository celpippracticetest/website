import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import type { AppDoc } from "./document";
import type { SqlParts } from "./whereBuilder";
import {
  collectJoinCollectionShortNames,
  loadAppDocumentsJoinCollection,
  PgAggregateCursor,
  PgFindCursor,
} from "./pgCollection";

type StripeSubscriptionRow = {
  stripe_id: string;
  customer_id: string | null;
  status: string;
  created_at: Date;
  current_period_start_at: Date | null;
  current_period_end_at: Date | null;
  canceled_at: Date | null;
  cancel_at_period_end: boolean;
  price_id: string | null;
  interval: string | null;
  interval_count: number | null;
  coupon_id: string | null;
  promotion_code_id: string | null;
  dunning_status: string | null;
  last_payment_failed_at: Date | null;
  metadata: unknown;
  updated_at: Date;
};

const STRIPE_SUBSCRIPTION_COLUMNS = `
  stripe_id,
  customer_id,
  status,
  created_at,
  current_period_start_at,
  current_period_end_at,
  canceled_at,
  cancel_at_period_end,
  price_id,
  interval,
  interval_count,
  coupon_id,
  promotion_code_id,
  dunning_status,
  last_payment_failed_at,
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

function asInt(value: unknown, fallback: number | null): number | null {
  if (value == null) return fallback;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?[0-9]+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function stripeSubscriptionRowToDoc(row: StripeSubscriptionRow): AppDoc {
  const metadataRaw = EJSON.deserialize(row.metadata ?? {});
  return {
    _id: row.stripe_id,
    stripeId: row.stripe_id,
    customerId: row.customer_id,
    status: row.status,
    createdAt: row.created_at,
    currentPeriodStartAt: row.current_period_start_at,
    currentPeriodEndAt: row.current_period_end_at,
    canceledAt: row.canceled_at,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    priceId: row.price_id,
    interval: row.interval,
    intervalCount: row.interval_count,
    couponId: row.coupon_id,
    promotionCodeId: row.promotion_code_id,
    dunningStatus: row.dunning_status,
    lastPaymentFailedAt: row.last_payment_failed_at,
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
    out.push(stripeSubscriptionRowToDoc(r as StripeSubscriptionRow) as T);
  }
  return out;
}

function stripeSubscriptionDocToRow(doc: AppDoc, updatedAt: Date): StripeSubscriptionRow {
  const stripeId = String(doc.stripeId ?? doc._id ?? "");
  const metadataSerialized = serializeDocument({
    metadata: doc.metadata ?? {},
  }) as { metadata: unknown };
  return {
    stripe_id: stripeId,
    customer_id:
      doc.customerId == null || doc.customerId === undefined
        ? null
        : String(doc.customerId),
    status: String(doc.status ?? "unknown"),
    created_at: asDate(doc.createdAt, updatedAt),
    current_period_start_at:
      doc.currentPeriodStartAt == null || doc.currentPeriodStartAt === undefined
        ? null
        : asDate(doc.currentPeriodStartAt, updatedAt),
    current_period_end_at:
      doc.currentPeriodEndAt == null || doc.currentPeriodEndAt === undefined
        ? null
        : asDate(doc.currentPeriodEndAt, updatedAt),
    canceled_at:
      doc.canceledAt == null || doc.canceledAt === undefined
        ? null
        : asDate(doc.canceledAt, updatedAt),
    cancel_at_period_end: asBool(doc.cancelAtPeriodEnd, false),
    price_id:
      doc.priceId == null || doc.priceId === undefined ? null : String(doc.priceId),
    interval:
      doc.interval == null || doc.interval === undefined ? null : String(doc.interval),
    interval_count: asInt(doc.intervalCount, null),
    coupon_id:
      doc.couponId == null || doc.couponId === undefined ? null : String(doc.couponId),
    promotion_code_id:
      doc.promotionCodeId == null || doc.promotionCodeId === undefined
        ? null
        : String(doc.promotionCodeId),
    dunning_status:
      doc.dunningStatus == null || doc.dunningStatus === undefined
        ? null
        : String(doc.dunningStatus),
    last_payment_failed_at:
      doc.lastPaymentFailedAt == null || doc.lastPaymentFailedAt === undefined
        ? null
        : asDate(doc.lastPaymentFailedAt, updatedAt),
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

function parseCanceledAtOrClause($or: unknown): SqlParts | null {
  if (!Array.isArray($or) || $or.length !== 2) return null;
  let nullBranch = false;
  let gtDate: Date | null = null;
  let gteDate: Date | null = null;
  for (const branch of $or) {
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) return null;
    const canceledAt = (branch as Record<string, unknown>).canceledAt;
    if (canceledAt === null) {
      nullBranch = true;
      continue;
    }
    if (!canceledAt || typeof canceledAt !== "object" || Array.isArray(canceledAt)) {
      return null;
    }
    const ops = canceledAt as Record<string, unknown>;
    if ("$gt" in ops) {
      const d = ops.$gt instanceof Date ? ops.$gt : new Date(String(ops.$gt));
      if (Number.isNaN(d.getTime())) return null;
      gtDate = d;
    } else if ("$gte" in ops) {
      const d = ops.$gte instanceof Date ? ops.$gte : new Date(String(ops.$gte));
      if (Number.isNaN(d.getTime())) return null;
      gteDate = d;
    } else {
      return null;
    }
  }
  if (!nullBranch) return null;
  const params: unknown[] = [];
  if (gtDate) {
    params.push(gtDate);
    return { clause: "(canceled_at IS NULL OR canceled_at > $1)", params };
  }
  if (gteDate) {
    params.push(gteDate);
    return { clause: "(canceled_at IS NULL OR canceled_at >= $1)", params };
  }
  return { clause: "canceled_at IS NULL", params: [] };
}

function stripeSubscriptionsBaseFilterToSql(
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
    if (k === "stripeId" && typeof v === "string") {
      parts.push(`stripe_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "status" && typeof v === "string") {
      parts.push(`status = $${paramIndex++}`);
      params.push(v);
    } else if (k === "status" && v && typeof v === "object" && !Array.isArray(v) && "$in" in v) {
      const $in = (v as { $in: unknown[] }).$in.filter((x): x is string => typeof x === "string");
      if (!$in.length) return { clause: "false", params: [] };
      params.push($in);
      parts.push(`status = ANY($${paramIndex++}::text[])`);
    } else if (k === "createdAt" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("created_at", op, val, paramIndex, params);
        if (!parsed) return null;
        parts.push(parsed.clause);
        paramIndex = parsed.nextIndex;
      }
    } else if (k === "canceledAt" && v === null) {
      parts.push("canceled_at IS NULL");
    } else if (k === "canceledAt" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("canceled_at", op, val, paramIndex, params);
        if (!parsed) return null;
        parts.push(parsed.clause);
        paramIndex = parsed.nextIndex;
      }
    } else if (k === "metadata.user_id" && v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if ("$in" in o && Array.isArray(o.$in)) {
        const $in = o.$in.filter((x): x is string => typeof x === "string");
        if (!$in.length) return { clause: "false", params: [] };
        params.push($in);
        parts.push(`metadata->>'user_id' = ANY($${paramIndex++}::text[])`);
      } else if ("$exists" in o && o.$exists === true && "$ne" in o && o.$ne === null) {
        parts.push(
          "metadata ? 'user_id' AND metadata->>'user_id' IS NOT NULL AND metadata->>'user_id' <> ''"
        );
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  if (parts.length === 0) return { clause: "true", params: [] };
  return { clause: parts.join(" AND "), params };
}

/** SQL filters for `public.stripe_subscriptions`. */
export function stripeSubscriptionsFilterToSql(
  filter: Record<string, unknown>
): SqlParts | null {
  if ("$expr" in filter || "$and" in filter || "$nor" in filter) {
    return null;
  }

  const { $or, ...rest } = filter;
  const base = stripeSubscriptionsBaseFilterToSql(rest);

  if ($or === undefined) {
    return base;
  }

  const orParts = parseCanceledAtOrClause($or);
  if (!orParts) return null;
  if (!base) return null;
  if (base.clause === "true") {
    return orParts;
  }
  const offset = base.params.length;
  const orClause = orParts.clause.replace(
    /\$(\d+)/g,
    (_, n) => `$${offset + Number(n)}`
  );
  return {
    clause: `(${base.clause}) AND (${orClause})`,
    params: [...base.params, ...orParts.params],
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

/** Full table preload for mingo `$lookup` when this collection is the join target. */
export async function loadStripeSubscriptionsForAggregateJoin(sql: Sql): Promise<AppDoc[]> {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM public.stripe_subscriptions`;
  const n = rows[0]?.c ?? 0;
  const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
  if (n > budget) {
    throw new Error(
      `stripe_subscriptions $lookup preload needs ${n} rows (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
    );
  }
  const all = await sql.unsafe(
    `SELECT ${STRIPE_SUBSCRIPTION_COLUMNS} FROM public.stripe_subscriptions ORDER BY stripe_id`,
    []
  );
  return mapRowsToDocs(all);
}

/**
 * Postgres-backed `stripe_subscriptions` reporting cache (replaces `app_documents` rows).
 */
export class PgStripeSubscriptionsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "stripe_subscriptions";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${STRIPE_SUBSCRIPTION_COLUMNS} FROM public.stripe_subscriptions ORDER BY stripe_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: String(doc.stripeId ?? doc._id),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.stripe_subscriptions`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = stripeSubscriptionsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${STRIPE_SUBSCRIPTION_COLUMNS} FROM public.stripe_subscriptions WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan stripe_subscriptions with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${STRIPE_SUBSCRIPTION_COLUMNS} FROM public.stripe_subscriptions ORDER BY created_at DESC`,
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
    const sqlParts = stripeSubscriptionsFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.stripe_subscriptions WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
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
    const row = stripeSubscriptionDocToRow(d, new Date());
    try {
      await this.sql`
        INSERT INTO public.stripe_subscriptions (
          stripe_id,
          customer_id,
          status,
          created_at,
          current_period_start_at,
          current_period_end_at,
          canceled_at,
          cancel_at_period_end,
          price_id,
          interval,
          interval_count,
          coupon_id,
          promotion_code_id,
          dunning_status,
          last_payment_failed_at,
          metadata,
          updated_at
        )
        VALUES (
          ${row.stripe_id},
          ${row.customer_id},
          ${row.status},
          ${row.created_at},
          ${row.current_period_start_at},
          ${row.current_period_end_at},
          ${row.canceled_at},
          ${row.cancel_at_period_end},
          ${row.price_id},
          ${row.interval},
          ${row.interval_count},
          ${row.coupon_id},
          ${row.promotion_code_id},
          ${row.dunning_status},
          ${row.last_payment_failed_at},
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
      const row = stripeSubscriptionDocToRow(next, now);
      await this.sql`
        UPDATE public.stripe_subscriptions
        SET
          customer_id = ${row.customer_id},
          status = ${row.status},
          created_at = ${row.created_at},
          current_period_start_at = ${row.current_period_start_at},
          current_period_end_at = ${row.current_period_end_at},
          canceled_at = ${row.canceled_at},
          cancel_at_period_end = ${row.cancel_at_period_end},
          price_id = ${row.price_id},
          interval = ${row.interval},
          interval_count = ${row.interval_count},
          coupon_id = ${row.coupon_id},
          promotion_code_id = ${row.promotion_code_id},
          dunning_status = ${row.dunning_status},
          last_payment_failed_at = ${row.last_payment_failed_at},
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
    return "noop_pg_stripe_subscriptions_index";
  }

  aggregate(pipeline: object[], _options?: { allowDiskUse?: boolean }): PgAggregateCursor {
    return new PgAggregateCursor(async () => {
      const joinShortNames = collectJoinCollectionShortNames(pipeline);
      const preload = new Map<string, AppDoc[]>();
      for (const short of joinShortNames) {
        if (short === "users") {
          const { loadUserProfilesForAggregateJoin } = await import("./usersCollection");
          preload.set(short, await loadUserProfilesForAggregateJoin(this.sql));
        } else {
          preload.set(short, await loadAppDocumentsJoinCollection(this.sql, short));
        }
      }

      const first = pipeline[0];
      const match =
        first && typeof first === "object" && "$match" in (first as object)
          ? ((first as { $match: Record<string, unknown> }).$match ?? null)
          : null;

      let docs: AppDoc[];
      if (match) {
        const sqlParts = stripeSubscriptionsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${STRIPE_SUBSCRIPTION_COLUMNS} FROM public.stripe_subscriptions WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
            sqlParts.params as never[]
          );
          docs = mapRowsToDocs(rows);
          const q = new Query(match);
          docs = docs.filter((doc) => q.test(doc as never));
          return mingoAggregate(docs, pipeline as never[], {
            collectionResolver: (name: string) => preload.get(name) ?? [],
          });
        }
      }

      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on stripe_subscriptions needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${STRIPE_SUBSCRIPTION_COLUMNS} FROM public.stripe_subscriptions ORDER BY created_at DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: (name: string) => preload.get(name) ?? [],
      });
    });
  }
}
