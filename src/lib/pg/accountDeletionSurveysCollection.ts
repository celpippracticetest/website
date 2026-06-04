import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import {
  objectIdLikeToHex,
  prepareInsertDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import { PgFindCursor } from "./pgCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;

type AccountDeletionSurveyRow = {
  user_id: string;
  legacy_mongo_id: string | null;
  flow_id: string | null;
  reason: string | null;
  other_reason: string | null;
  alternative_service: string | null;
  deletion_rating: number | null;
  deletion_feedback: string | null;
  created_at: Date;
  updated_at: Date;
};

const ACCOUNT_DELETION_SURVEY_COLUMNS = `
  user_id,
  legacy_mongo_id,
  flow_id,
  reason,
  other_reason,
  alternative_service,
  deletion_rating,
  deletion_feedback,
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

function nullableString(value: unknown): string | null {
  if (value == null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function asRating(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.trunc(value);
    return n >= 1 && n <= 5 ? n : null;
  }
  if (typeof value === "string" && /^[1-5]$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return null;
}

function rowIdToDocId(mongoId: string | null, userId: string): ObjectId | string {
  if (mongoId && OID_HEX.test(mongoId)) return new ObjectId(mongoId);
  return mongoId ?? userId;
}

function accountDeletionSurveyRowToDoc(row: AccountDeletionSurveyRow): AppDoc {
  return {
    _id: rowIdToDocId(row.legacy_mongo_id, row.user_id),
    userId: row.user_id,
    flowId: row.flow_id,
    reason: row.reason ?? undefined,
    otherReason: row.other_reason ?? undefined,
    alternativeService: row.alternative_service ?? undefined,
    deletionRating: row.deletion_rating,
    deletionFeedback: row.deletion_feedback ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(accountDeletionSurveyRowToDoc(r as AccountDeletionSurveyRow) as T);
  }
  return out;
}

function accountDeletionSurveyDocToRow(doc: AppDoc, updatedAt: Date): AccountDeletionSurveyRow {
  const legacyHex = objectIdLikeToHex(doc._id);
  return {
    user_id: String(doc.userId ?? ""),
    legacy_mongo_id: legacyHex,
    flow_id: nullableString(doc.flowId),
    reason: nullableString(doc.reason),
    other_reason: nullableString(doc.otherReason),
    alternative_service: nullableString(doc.alternativeService),
    deletion_rating: asRating(doc.deletionRating),
    deletion_feedback: nullableString(doc.deletionFeedback),
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.account_deletion_surveys`. */
export function accountDeletionSurveysFilterToSql(
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
    if (k === "userId" && typeof v === "string") {
      parts.push(`user_id = $${paramIndex++}`);
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
 * Postgres-backed `account_deletion_surveys` (one row per user; replaces `app_documents`).
 */
export class PgAccountDeletionSurveysCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "account_deletion_surveys";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.account_deletion_surveys`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = accountDeletionSurveysFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${ACCOUNT_DELETION_SURVEY_COLUMNS} FROM public.account_deletion_surveys WHERE ${sqlParts.clause} ORDER BY updated_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan account_deletion_surveys with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${ACCOUNT_DELETION_SURVEY_COLUMNS} FROM public.account_deletion_surveys ORDER BY updated_at DESC`,
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
    const sqlParts = accountDeletionSurveysFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.account_deletion_surveys WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
      );
      return rows[0]?.c ?? 0;
    }
    return (await this.findDocuments(filter)).length;
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
        const row = accountDeletionSurveyDocToRow(next, new Date());
        if (!row.user_id) {
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        }
        const { mongoId } = prepareInsertDocument(next);
        row.legacy_mongo_id = row.legacy_mongo_id ?? mongoId;
        const inserted = await this.sql`
          INSERT INTO public.account_deletion_surveys (
            user_id,
            legacy_mongo_id,
            flow_id,
            reason,
            other_reason,
            alternative_service,
            deletion_rating,
            deletion_feedback,
            created_at,
            updated_at
          )
          VALUES (
            ${row.user_id},
            ${row.legacy_mongo_id},
            ${row.flow_id},
            ${row.reason},
            ${row.other_reason},
            ${row.alternative_service},
            ${row.deletion_rating},
            ${row.deletion_feedback},
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
      const row = accountDeletionSurveyDocToRow(next, now);
      await this.sql`
        UPDATE public.account_deletion_surveys
        SET
          flow_id = ${row.flow_id},
          reason = ${row.reason},
          other_reason = ${row.other_reason},
          alternative_service = ${row.alternative_service},
          deletion_rating = ${row.deletion_rating},
          deletion_feedback = ${row.deletion_feedback},
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

  async createIndex(
    _spec: Record<string, 1 | -1>,
    _options?: { unique?: boolean; name?: string }
  ): Promise<string> {
    return "noop_pg_account_deletion_surveys_index";
  }
}
