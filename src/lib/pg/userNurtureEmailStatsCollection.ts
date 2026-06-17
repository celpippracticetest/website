import { ObjectId } from "bson";
import { Query, aggregate as mingoAggregate } from "mingo";
import type { Sql } from "postgres";
import { prepareInsertDocument, type AppDoc } from "./document";
import type { SqlParts } from "./whereBuilder";
import { bindUnsafeParams } from "./bindUnsafeParams";
import { PgAggregateCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

const NURTURE_FLOWS = ["signup", "free_user_active", "inactive_free"] as const;

type UserNurtureEmailStatRow = {
  mongo_id: string;
  user_id: string;
  flow: string;
  stage_id: string;
  stage_label: string | null;
  email_provider: string;
  subject: string | null;
  sent_at: Date;
  created_at: Date;
  resend_message_id: string | null;
  opened_at: Date | null;
  last_opened_at: Date | null;
  open_count: number;
  clicked_at: Date | null;
  last_clicked_at: Date | null;
  click_count: number;
};

const USER_NURTURE_EMAIL_STAT_COLUMNS = `
  mongo_id,
  user_id,
  flow,
  stage_id,
  stage_label,
  email_provider,
  subject,
  sent_at,
  created_at,
  resend_message_id,
  opened_at,
  last_opened_at,
  open_count,
  clicked_at,
  last_clicked_at,
  click_count
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

function normalizeFlow(value: unknown): string {
  if (typeof value === "string" && (NURTURE_FLOWS as readonly string[]).includes(value)) {
    return value;
  }
  return "signup";
}

function userNurtureEmailStatRowToDoc(row: UserNurtureEmailStatRow): AppDoc {
  return {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    userId: row.user_id,
    flow: row.flow,
    stageId: row.stage_id,
    stageLabel: row.stage_label ?? undefined,
    emailProvider: row.email_provider,
    subject: row.subject ?? undefined,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    resendMessageId: row.resend_message_id ?? undefined,
    openedAt: row.opened_at ?? undefined,
    lastOpenedAt: row.last_opened_at ?? undefined,
    openCount: row.open_count,
    clickedAt: row.clicked_at ?? undefined,
    lastClickedAt: row.last_clicked_at ?? undefined,
    clickCount: row.click_count,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userNurtureEmailStatRowToDoc(r as UserNurtureEmailStatRow) as T);
  }
  return out;
}

function userNurtureEmailStatDocToRow(doc: AppDoc, mongoId: string): UserNurtureEmailStatRow {
  const now = new Date();
  const sentAt = asDate(doc.sentAt, now);
  const createdAt = asDate(doc.createdAt, sentAt);
  return {
    mongo_id: mongoId,
    user_id: String(doc.userId ?? ""),
    flow: normalizeFlow(doc.flow),
    stage_id: String(doc.stageId ?? ""),
    stage_label:
      doc.stageLabel == null || doc.stageLabel === undefined
        ? null
        : String(doc.stageLabel),
    email_provider:
      doc.emailProvider == null || doc.emailProvider === undefined
        ? "resend"
        : String(doc.emailProvider),
    subject:
      doc.subject == null || doc.subject === undefined ? null : String(doc.subject),
    sent_at: sentAt,
    created_at: createdAt,
    resend_message_id:
      doc.resendMessageId == null || doc.resendMessageId === undefined
        ? null
        : String(doc.resendMessageId),
    opened_at: doc.openedAt instanceof Date ? doc.openedAt : null,
    last_opened_at: doc.lastOpenedAt instanceof Date ? doc.lastOpenedAt : null,
    open_count: typeof doc.openCount === "number" ? doc.openCount : 0,
    clicked_at: doc.clickedAt instanceof Date ? doc.clickedAt : null,
    last_clicked_at: doc.lastClickedAt instanceof Date ? doc.lastClickedAt : null,
    click_count: typeof doc.clickCount === "number" ? doc.clickCount : 0,
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

/** SQL filters for `public.user_nurture_email_stats`. */
export function userNurtureEmailStatsFilterToSql(
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
    } else if (k === "flow" && typeof v === "string") {
      parts.push(`flow = $${paramIndex++}`);
      params.push(v);
    } else if (k === "stageId" && typeof v === "string") {
      parts.push(`stage_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "resendMessageId" && typeof v === "string") {
      parts.push(`resend_message_id = $${paramIndex++}`);
      params.push(v);
    } else if (k === "sentAt" && v && typeof v === "object" && !Array.isArray(v)) {
      for (const [op, val] of Object.entries(v as Record<string, unknown>)) {
        const parsed = parseTimestampFilter("sent_at", op, val, paramIndex, params);
        if (!parsed) return null;
        parts.push(parsed.clause);
        paramIndex = parsed.nextIndex;
      }
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
 * Postgres-backed `usernurtureemailstats` collection (append-only send log).
 */
export class PgUserNurtureEmailStatsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "usernurtureemailstats";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.user_nurture_email_stats`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userNurtureEmailStatsFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_NURTURE_EMAIL_STAT_COLUMNS} FROM public.user_nurture_email_stats WHERE ${sqlParts.clause} ORDER BY sent_at DESC`,
        bindUnsafeParams(this.sql, sqlParts.params) as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan user_nurture_email_stats with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${USER_NURTURE_EMAIL_STAT_COLUMNS} FROM public.user_nurture_email_stats ORDER BY sent_at DESC`,
      []
    );
    return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = userNurtureEmailStatDocToRow(doc as AppDoc, mongoId);
    try {
      await this.sql`
        INSERT INTO public.user_nurture_email_stats (
          mongo_id,
          user_id,
          flow,
          stage_id,
          stage_label,
          email_provider,
          subject,
          sent_at,
          created_at,
          resend_message_id,
          open_count,
          click_count
        )
        VALUES (
          ${row.mongo_id},
          ${row.user_id},
          ${row.flow},
          ${row.stage_id},
          ${row.stage_label},
          ${row.email_provider},
          ${row.subject},
          ${row.sent_at},
          ${row.created_at},
          ${row.resend_message_id},
          ${row.open_count},
          ${row.click_count}
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
        const sqlParts = userNurtureEmailStatsFilterToSql(match);
        if (sqlParts && sqlParts.clause !== "true") {
          const rows = await this.sql.unsafe(
            `SELECT ${USER_NURTURE_EMAIL_STAT_COLUMNS} FROM public.user_nurture_email_stats WHERE ${sqlParts.clause} ORDER BY sent_at DESC`,
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
          `Aggregate on user_nurture_email_stats needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${USER_NURTURE_EMAIL_STAT_COLUMNS} FROM public.user_nurture_email_stats ORDER BY sent_at DESC`,
        []
      );
      docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: () => [],
      });
    });
  }
}
