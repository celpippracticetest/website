import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate } from "mingo";
import type { Sql } from "postgres";
import { prepareInsertDocument, type AppDoc } from "./document";
import type { SqlParts } from "./whereBuilder";
import { bindUnsafeParams } from "./bindUnsafeParams";
import { PgAggregateCursor, PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type CancellationFlowEventRow = {
  mongo_id: string;
  user_id: string;
  flow_id: string | null;
  event_name: string;
  step: string | null;
  reason: string | null;
  metadata: unknown;
  created_at: Date;
};

const CANCELLATION_FLOW_EVENT_COLUMNS = `
  mongo_id,
  user_id,
  flow_id,
  event_name,
  step,
  reason,
  metadata,
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

function nullableString(value: unknown): string | null {
  if (value == null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function metadataForInsert(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function renumberClause(clause: string, paramOffset: number): string {
  if (paramOffset === 0) return clause;
  return clause.replace(/\$(\d+)/g, (_, n) => `$${paramOffset + Number(n)}`);
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

/** SQL filters for `public.cancellation_flow_events` (admin retention queries). */
export function cancellationFlowEventsFilterToSql(
  filter: Record<string, unknown>
): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if ("$expr" in filter || "$and" in filter) {
    return null;
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if ("$or" in filter) {
    const orValue = filter.$or;
    if (!Array.isArray(orValue)) return null;
    const orParts: string[] = [];
    for (const sub of orValue) {
      if (!sub || typeof sub !== "object" || Array.isArray(sub)) return null;
      const subSql = cancellationFlowEventsFilterToSql(sub as Record<string, unknown>);
      if (!subSql) return null;
      if (subSql.clause === "false") continue;
      if (subSql.clause === "true") {
        orParts.length = 0;
        orParts.push("true");
        break;
      }
      const offset = params.length;
      orParts.push(`(${renumberClause(subSql.clause, offset)})`);
      params.push(...subSql.params);
      paramIndex = params.length + 1;
    }
    if (orParts.length === 0) {
      parts.push("false");
    } else if (orParts.includes("true")) {
      parts.push("true");
    } else {
      parts.push(`(${orParts.join(" OR ")})`);
    }
  }

  for (const [k, v] of Object.entries(filter)) {
    if (k.startsWith("$")) continue;
    if (k === "eventName") {
      const parsed = parseTextFilter("event_name", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "userId") {
      const parsed = parseTextFilter("user_id", v, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    } else if (k === "flowId") {
      const parsed = parseTextFilter("flow_id", v, paramIndex, params);
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
    } else {
      return null;
    }
  }

  if (parts.length === 0) return { clause: "true", params: [] };
  return { clause: parts.join(" AND "), params };
}

function cancellationFlowEventRowToDoc(row: CancellationFlowEventRow): AppDoc {
  const metadataRaw = EJSON.deserialize(row.metadata ?? null);
  return {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    userId: row.user_id,
    flowId: row.flow_id,
    eventName: row.event_name,
    step: row.step ?? undefined,
    reason: row.reason ?? undefined,
    metadata:
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? metadataRaw
        : null,
    createdAt: row.created_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(cancellationFlowEventRowToDoc(r as CancellationFlowEventRow) as T);
  }
  return out;
}

function cancellationFlowEventDocToRow(doc: AppDoc, mongoId: string): CancellationFlowEventRow {
  const eventName = nullableString(doc.eventName);
  if (!eventName) {
    throw new Error("cancellation_flow_events requires eventName");
  }
  const userId = nullableString(doc.userId);
  if (!userId) {
    throw new Error("cancellation_flow_events requires userId");
  }
  return {
    mongo_id: mongoId,
    user_id: userId,
    flow_id: nullableString(doc.flowId),
    event_name: eventName,
    step: nullableString(doc.step),
    reason: nullableString(doc.reason),
    metadata: metadataForInsert(doc.metadata),
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
 * Postgres-backed `cancellation_flow_events` (append-only event log).
 */
export class PgCancellationFlowEventsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "cancellation_flow_events";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.cancellation_flow_events`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = cancellationFlowEventsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${CANCELLATION_FLOW_EVENT_COLUMNS} FROM public.cancellation_flow_events WHERE ${sqlParts.clause} ORDER BY created_at ASC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan cancellation_flow_events with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${CANCELLATION_FLOW_EVENT_COLUMNS} FROM public.cancellation_flow_events ORDER BY created_at ASC`,
      []
    );
    return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
  }

  find(filter: Record<string, unknown> = {}, _options?: unknown): PgFindCursor<T> {
    return new PgFindCursor<T>(this as never, filter);
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = cancellationFlowEventDocToRow(doc as AppDoc, mongoId);
    const metadata = row.metadata as Record<string, unknown> | null;
    try {
      await this.sql`
        INSERT INTO public.cancellation_flow_events (
          mongo_id,
          user_id,
          flow_id,
          event_name,
          step,
          reason,
          metadata,
          created_at
        )
        VALUES (
          ${row.mongo_id},
          ${row.user_id},
          ${row.flow_id},
          ${row.event_name},
          ${row.step},
          ${row.reason},
          ${metadata == null ? null : this.sql.json(metadata as never)},
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
        const sqlParts = cancellationFlowEventsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${CANCELLATION_FLOW_EVENT_COLUMNS} FROM public.cancellation_flow_events WHERE ${sqlParts.clause} ORDER BY created_at ASC`,
            bindUnsafeParams(this.sql, sqlParts.params) as never[]
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
          `Aggregate on cancellation_flow_events needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${CANCELLATION_FLOW_EVENT_COLUMNS} FROM public.cancellation_flow_events ORDER BY created_at ASC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
