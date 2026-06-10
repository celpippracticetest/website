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
const REMINDER_FLOWS = ["signup_no_activity", "inactive", "subscribed_referral"] as const;

type UserActivityReminderRow = {
  user_id: string;
  legacy_mongo_id: string | null;
  last_reminder_sent_at: Date | null;
  reminder_flow: string | null;
  reminder_stage_id: string | null;
  reminder_variant: string | null;
  last_engaged_at: Date | null;
  reminder_window_started_at: Date | null;
  reminders_in_window: number;
  created_at: Date;
  updated_at: Date;
};

const USER_ACTIVITY_REMINDER_COLUMNS = `
  user_id,
  legacy_mongo_id,
  last_reminder_sent_at,
  reminder_flow,
  reminder_stage_id,
  reminder_variant,
  last_engaged_at,
  reminder_window_started_at,
  reminders_in_window,
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

function asDate(value: unknown, fallback: Date | null): Date | null {
  if (value == null) return fallback;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function asInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?[0-9]+$/.test(value.trim())) {
    return parseInt(value, 10);
  }
  return fallback;
}

function normalizeFlow(value: unknown): string | null {
  if (typeof value === "string" && (REMINDER_FLOWS as readonly string[]).includes(value)) {
    return value;
  }
  return null;
}

function normalizeVariant(value: unknown): string | null {
  if (value === "A" || value === "B") return value;
  return null;
}

function rowIdToDocId(mongoId: string | null, userId: string): ObjectId | string {
  if (mongoId && OID_HEX.test(mongoId)) return new ObjectId(mongoId);
  return mongoId ?? userId;
}

function userActivityReminderRowToDoc(row: UserActivityReminderRow): AppDoc {
  return {
    _id: rowIdToDocId(row.legacy_mongo_id, row.user_id),
    userId: row.user_id,
    lastReminderSentAt: row.last_reminder_sent_at ?? undefined,
    reminderFlow: row.reminder_flow ?? undefined,
    reminderStageId: row.reminder_stage_id ?? undefined,
    reminderVariant: row.reminder_variant ?? undefined,
    lastEngagedAt: row.last_engaged_at ?? undefined,
    reminderWindowStartedAt: row.reminder_window_started_at ?? undefined,
    remindersInWindow: row.reminders_in_window,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userActivityReminderRowToDoc(r as UserActivityReminderRow) as T);
  }
  return out;
}

function userActivityReminderDocToRow(doc: AppDoc, updatedAt: Date): UserActivityReminderRow {
  const legacyHex = objectIdLikeToHex(doc._id);
  const created = asDate(doc.createdAt, updatedAt) ?? updatedAt;
  return {
    user_id: String(doc.userId ?? ""),
    legacy_mongo_id: legacyHex,
    last_reminder_sent_at: asDate(doc.lastReminderSentAt, null),
    reminder_flow: normalizeFlow(doc.reminderFlow),
    reminder_stage_id:
      doc.reminderStageId == null || doc.reminderStageId === undefined
        ? null
        : String(doc.reminderStageId),
    reminder_variant: normalizeVariant(doc.reminderVariant),
    last_engaged_at: asDate(doc.lastEngagedAt, null),
    reminder_window_started_at: asDate(doc.reminderWindowStartedAt, null),
    reminders_in_window: asInt(doc.remindersInWindow, 0),
    created_at: created,
    updated_at: updatedAt,
  };
}

/** SQL filters for `public.user_activity_reminders`. */
export function userActivityRemindersFilterToSql(
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
 * Postgres-backed `useractivityreminders` (one row per user; replaces `app_documents`).
 */
export class PgUserActivityRemindersCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "useractivityreminders";

  constructor(private readonly sql: Sql) {}

  private async countAll(): Promise<number> {
    const rows =
      await this.sql`SELECT COUNT(*)::int AS c FROM public.user_activity_reminders`;
    return rows[0]?.c ?? 0;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = userActivityRemindersFilterToSql(filter);
    const q = new Query(filter);

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_ACTIVITY_REMINDER_COLUMNS} FROM public.user_activity_reminders WHERE ${sqlParts.clause} ORDER BY updated_at DESC`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows).filter((doc) => q.test(doc as never));
    }

    const n = await this.countAll();
    if (n > maxScan()) {
      throw new Error(
        `Refusing to scan user_activity_reminders with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
      );
    }
    const rows = await this.sql.unsafe(
      `SELECT ${USER_ACTIVITY_REMINDER_COLUMNS} FROM public.user_activity_reminders ORDER BY updated_at DESC`,
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
        const row = userActivityReminderDocToRow(next, new Date());
        if (!row.user_id) {
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        }
        const { mongoId } = prepareInsertDocument(next);
        row.legacy_mongo_id = row.legacy_mongo_id ?? mongoId;
        const inserted = await this.sql`
          INSERT INTO public.user_activity_reminders (
            user_id,
            legacy_mongo_id,
            last_reminder_sent_at,
            reminder_flow,
            reminder_stage_id,
            reminder_variant,
            last_engaged_at,
            reminder_window_started_at,
            reminders_in_window,
            created_at,
            updated_at
          )
          VALUES (
            ${row.user_id},
            ${row.legacy_mongo_id},
            ${row.last_reminder_sent_at},
            ${row.reminder_flow},
            ${row.reminder_stage_id},
            ${row.reminder_variant},
            ${row.last_engaged_at},
            ${row.reminder_window_started_at},
            ${row.reminders_in_window},
            ${row.created_at},
            ${row.updated_at}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            legacy_mongo_id = COALESCE(
              public.user_activity_reminders.legacy_mongo_id,
              EXCLUDED.legacy_mongo_id
            ),
            last_reminder_sent_at = EXCLUDED.last_reminder_sent_at,
            reminder_flow = EXCLUDED.reminder_flow,
            reminder_stage_id = EXCLUDED.reminder_stage_id,
            reminder_variant = EXCLUDED.reminder_variant,
            last_engaged_at = EXCLUDED.last_engaged_at,
            reminder_window_started_at = EXCLUDED.reminder_window_started_at,
            reminders_in_window = EXCLUDED.reminders_in_window,
            updated_at = EXCLUDED.updated_at
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
      const row = userActivityReminderDocToRow(next, now);
      await this.sql`
        UPDATE public.user_activity_reminders
        SET
          last_reminder_sent_at = ${row.last_reminder_sent_at},
          reminder_flow = ${row.reminder_flow},
          reminder_stage_id = ${row.reminder_stage_id},
          reminder_variant = ${row.reminder_variant},
          last_engaged_at = ${row.last_engaged_at},
          reminder_window_started_at = ${row.reminder_window_started_at},
          reminders_in_window = ${row.reminders_in_window},
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
}
