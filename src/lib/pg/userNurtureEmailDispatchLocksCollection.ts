import { ObjectId } from "bson";
import type { Sql } from "postgres";
import { prepareInsertDocument, type AppDoc } from "./document";

type DispatchLockRow = {
  lock_id: string;
  user_id: string;
  claim_key: string;
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

function dispatchLockDocToRow(doc: AppDoc, lockId: string): DispatchLockRow {
  const created = asDate(doc.createdAt, new Date());
  const userId = String(doc.userId ?? "");
  const claimKey = String(doc.claimKey ?? "");
  return {
    lock_id: lockId,
    user_id: userId,
    claim_key: claimKey,
    created_at: created,
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
 * Postgres-backed `usernurtureemaildispatchlocks` (append-only claim locks).
 */
export class PgUserNurtureEmailDispatchLocksCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "usernurtureemaildispatchlocks";

  constructor(private readonly sql: Sql) {}

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = dispatchLockDocToRow(doc as AppDoc, mongoId);
    if (!row.user_id || !row.claim_key) {
      throw new Error("usernurtureemaildispatchlocks requires userId and claimKey");
    }
    try {
      await this.sql`
        INSERT INTO public.user_nurture_email_dispatch_locks (
          lock_id,
          user_id,
          claim_key,
          created_at
        )
        VALUES (
          ${row.lock_id},
          ${row.user_id},
          ${row.claim_key},
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
          : mongoId;
    return { acknowledged: true, insertedId };
  }
}
