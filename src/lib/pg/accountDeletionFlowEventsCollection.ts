import { ObjectId } from "bson";
import type { Sql } from "postgres";
import { prepareInsertDocument, type AppDoc } from "./document";

type AccountDeletionFlowEventRow = {
  mongo_id: string;
  user_id: string;
  flow_id: string | null;
  event_name: string;
  step: string | null;
  reason: string | null;
  metadata: unknown;
  created_at: Date;
};

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

function accountDeletionFlowEventDocToRow(
  doc: AppDoc,
  mongoId: string
): AccountDeletionFlowEventRow {
  const eventName = nullableString(doc.eventName);
  if (!eventName) {
    throw new Error("account_deletion_flow_events requires eventName");
  }
  const userId = nullableString(doc.userId);
  if (!userId) {
    throw new Error("account_deletion_flow_events requires userId");
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
 * Postgres-backed `account_deletion_flow_events` (append-only event log).
 */
export class PgAccountDeletionFlowEventsCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "account_deletion_flow_events";

  constructor(private readonly sql: Sql) {}

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = accountDeletionFlowEventDocToRow(doc as AppDoc, mongoId);
    const metadata = row.metadata as Record<string, unknown> | null;
    try {
      await this.sql`
        INSERT INTO public.account_deletion_flow_events (
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
}
