import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate } from "mingo";
import type { Sql } from "postgres";
import {
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgAggregateCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type PricingAbEventRow = {
  mongo_id: string;
  event_type: string;
  layout: string;
  user_id: string | null;
  price_id: string | null;
  plan_name: string | null;
  session_id: string | null;
  amount_total: number | null;
  purchase_page: string | null;
  guest_checkout: boolean;
  created_at: Date;
};

const PRICING_AB_EVENT_COLUMNS = `
  mongo_id,
  event_type,
  layout,
  user_id,
  price_id,
  plan_name,
  session_id,
  amount_total,
  purchase_page,
  guest_checkout,
  created_at
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

function asInt(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?[0-9]+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return null;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function normalizeLayout(value: unknown): string {
  if (typeof value === "string" && value === "switch_toggle") return "switch_toggle";
  return "two_card";
}

function normalizeEventType(value: unknown): string {
  if (value === "checkout_started" || value === "purchase") return value;
  return "page_view";
}

function pricingAbEventRowToDoc(row: PricingAbEventRow): AppDoc {
  return {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    eventType: row.event_type,
    layout: row.layout,
    userId: row.user_id,
    priceId: row.price_id ?? undefined,
    planName: row.plan_name ?? undefined,
    sessionId: row.session_id,
    amountTotal: row.amount_total,
    purchasePage: row.purchase_page ?? undefined,
    guestCheckout: row.guest_checkout,
    createdAt: row.created_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(pricingAbEventRowToDoc(r as PricingAbEventRow) as T);
  }
  return out;
}

function pricingAbEventDocToRow(doc: AppDoc, mongoId: string): PricingAbEventRow {
  const created = asDate(doc.createdAt, new Date());
  return {
    mongo_id: mongoId,
    event_type: normalizeEventType(doc.eventType),
    layout: normalizeLayout(doc.layout),
    user_id:
      doc.userId == null || doc.userId === undefined || doc.userId === ""
        ? null
        : String(doc.userId),
    price_id:
      doc.priceId == null || doc.priceId === undefined ? null : String(doc.priceId),
    plan_name:
      doc.planName == null || doc.planName === undefined ? null : String(doc.planName),
    session_id:
      doc.sessionId == null || doc.sessionId === undefined ? null : String(doc.sessionId),
    amount_total: asInt(doc.amountTotal),
    purchase_page:
      doc.purchasePage == null || doc.purchasePage === undefined
        ? null
        : String(doc.purchasePage),
    guest_checkout: asBool(doc.guestCheckout, false),
    created_at: created,
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

/** SQL filters for `public.pricing_ab_events`. */
export function pricingAbEventsFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }
  if ("$or" in filter || "$expr" in filter || "$and" in filter) {
    return null;
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) return null;
    if (k === "eventType" && typeof v === "string") {
      parts.push(`event_type = $${paramIndex++}`);
      params.push(v);
    } else if (k === "layout" && typeof v === "string") {
      parts.push(`layout = $${paramIndex++}`);
      params.push(v);
    } else if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
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
 * Postgres-backed `pricing_ab_events` collection (append-only event log).
 */
export class PgPricingAbEventsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "pricing_ab_events";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.pricing_ab_events`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = pricingAbEventsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${PRICING_AB_EVENT_COLUMNS} FROM public.pricing_ab_events WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan pricing_ab_events with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${PRICING_AB_EVENT_COLUMNS} FROM public.pricing_ab_events ORDER BY created_at DESC`,
      []
    );
    return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = pricingAbEventDocToRow(doc as AppDoc, mongoId);
    try {
      await this.sql`
        INSERT INTO public.pricing_ab_events (
          mongo_id,
          event_type,
          layout,
          user_id,
          price_id,
          plan_name,
          session_id,
          amount_total,
          purchase_page,
          guest_checkout,
          created_at
        )
        VALUES (
          ${row.mongo_id},
          ${row.event_type},
          ${row.layout},
          ${row.user_id},
          ${row.price_id},
          ${row.plan_name},
          ${row.session_id},
          ${row.amount_total},
          ${row.purchase_page},
          ${row.guest_checkout},
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
    const d = doc as AppDoc;
    const insertedId: ObjectId | string | number =
      d._id instanceof ObjectId
        ? d._id
        : typeof d._id === "string" || typeof d._id === "number" || typeof d._id === "bigint"
          ? d._id
          : new ObjectId(mongoId);
    return { acknowledged: true, insertedId };
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
        const sqlParts = pricingAbEventsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${PRICING_AB_EVENT_COLUMNS} FROM public.pricing_ab_events WHERE ${sqlParts.clause} ORDER BY created_at DESC`,
            sqlParts.params as never[]
          );
          docs = mapRowsToDocs(rows);
          const q = new Query(match);
          docs = docs.filter((doc) => q.test(doc as never));
          return mingoAggregate(docs, pipeline as never[], {
            collectionResolver: () => [],
          });
        }
      }

      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on pricing_ab_events needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${PRICING_AB_EVENT_COLUMNS} FROM public.pricing_ab_events ORDER BY created_at DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
