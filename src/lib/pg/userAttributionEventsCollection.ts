import { ObjectId } from "bson";
import { Query, aggregate as mingoAggregate } from "mingo";
import type { Sql } from "postgres";
import { prepareInsertDocument, type AppDoc } from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgAggregateCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type UserAttributionEventRow = {
  mongo_id: string;
  user_id: string;
  session_id: string | null;
  event_type: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  google_ads_campaign_id: string | null;
  fbclid: string | null;
  msclkid: string | null;
  ttclid: string | null;
  entry_page: string | null;
  referrer: string | null;
  country: string | null;
  currency: string | null;
  captured_at: Date;
};

const USER_ATTRIBUTION_EVENT_COLUMNS = `
  mongo_id,
  user_id,
  session_id,
  event_type,
  source,
  medium,
  campaign,
  content,
  term,
  gclid,
  gbraid,
  wbraid,
  google_ads_campaign_id,
  fbclid,
  msclkid,
  ttclid,
  entry_page,
  referrer,
  country,
  currency,
  captured_at
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

function userAttributionEventRowToDoc(row: UserAttributionEventRow): AppDoc {
  return {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    userId: row.user_id,
    sessionId: row.session_id,
    eventType: row.event_type,
    source: row.source ?? undefined,
    medium: row.medium ?? undefined,
    campaign: row.campaign ?? undefined,
    content: row.content ?? undefined,
    term: row.term ?? undefined,
    gclid: row.gclid,
    gbraid: row.gbraid,
    wbraid: row.wbraid,
    googleAdsCampaignId: row.google_ads_campaign_id,
    fbclid: row.fbclid,
    msclkid: row.msclkid,
    ttclid: row.ttclid,
    entryPage: row.entry_page ?? undefined,
    referrer: row.referrer,
    country: row.country ?? undefined,
    currency: row.currency ?? undefined,
    capturedAt: row.captured_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userAttributionEventRowToDoc(r as UserAttributionEventRow) as T);
  }
  return out;
}

function userAttributionEventDocToRow(doc: AppDoc, mongoId: string): UserAttributionEventRow {
  return {
    mongo_id: mongoId,
    user_id: String(doc.userId ?? ""),
    session_id: nullableString(doc.sessionId),
    event_type: nullableString(doc.eventType) ?? "attribution_update",
    source: nullableString(doc.source),
    medium: nullableString(doc.medium),
    campaign: nullableString(doc.campaign),
    content: nullableString(doc.content),
    term: nullableString(doc.term),
    gclid: nullableString(doc.gclid),
    gbraid: nullableString(doc.gbraid),
    wbraid: nullableString(doc.wbraid),
    google_ads_campaign_id: nullableString(doc.googleAdsCampaignId),
    fbclid: nullableString(doc.fbclid),
    msclkid: nullableString(doc.msclkid),
    ttclid: nullableString(doc.ttclid),
    entry_page: nullableString(doc.entryPage),
    referrer: nullableString(doc.referrer),
    country: nullableString(doc.country),
    currency: nullableString(doc.currency),
    captured_at: asDate(doc.capturedAt, new Date()),
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

/** SQL filters for `public.user_attribution_events`. */
export function userAttributionEventsFilterToSql(
  filter: Record<string, unknown>
): SqlParts | null {
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
    if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "eventType" && typeof v === "string") {
      parts.push(`event_type = $${paramIndex++}`);
      params.push(v);
    } else if (k === "capturedAt" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("captured_at", op, val, paramIndex, params);
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
 * Postgres-backed `user_attribution_events` collection (append-only event log).
 */
export class PgUserAttributionEventsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "user_attribution_events";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.user_attribution_events`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userAttributionEventsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_ATTRIBUTION_EVENT_COLUMNS} FROM public.user_attribution_events WHERE ${sqlParts.clause} ORDER BY captured_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan user_attribution_events with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${USER_ATTRIBUTION_EVENT_COLUMNS} FROM public.user_attribution_events ORDER BY captured_at DESC`,
      []
    );
    return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = userAttributionEventDocToRow(doc as AppDoc, mongoId);
    if (!row.user_id) {
      throw new Error("user_attribution_events requires userId");
    }
    try {
      await this.sql`
        INSERT INTO public.user_attribution_events (
          mongo_id,
          user_id,
          session_id,
          event_type,
          source,
          medium,
          campaign,
          content,
          term,
          gclid,
          gbraid,
          wbraid,
          google_ads_campaign_id,
          fbclid,
          msclkid,
          ttclid,
          entry_page,
          referrer,
          country,
          currency,
          captured_at
        )
        VALUES (
          ${row.mongo_id},
          ${row.user_id},
          ${row.session_id},
          ${row.event_type},
          ${row.source},
          ${row.medium},
          ${row.campaign},
          ${row.content},
          ${row.term},
          ${row.gclid},
          ${row.gbraid},
          ${row.wbraid},
          ${row.google_ads_campaign_id},
          ${row.fbclid},
          ${row.msclkid},
          ${row.ttclid},
          ${row.entry_page},
          ${row.referrer},
          ${row.country},
          ${row.currency},
          ${row.captured_at}
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
        const sqlParts = userAttributionEventsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${USER_ATTRIBUTION_EVENT_COLUMNS} FROM public.user_attribution_events WHERE ${sqlParts.clause} ORDER BY captured_at DESC`,
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
          `Aggregate on user_attribution_events needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${USER_ATTRIBUTION_EVENT_COLUMNS} FROM public.user_attribution_events ORDER BY captured_at DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
