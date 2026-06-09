import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import {
  documentRowKey,
  objectIdLikeToHex,
  prepareInsertDocument,
  rowToDocument,
  type AppDoc,
} from "./document";
import type { SqlParts } from "./whereBuilder";
import {
  collectJoinCollectionShortNames,
  PgAggregateCursor,
  PgFindCursor,
} from "./pgCollection";
import { loadUserActivitiesForAggregateJoin } from "./userActivitiesCollection";

const OID_HEX = /^[a-f0-9]{24}$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UserProfileRow = {
  mongo_id: string;
  legacy_body?: unknown | null;
  supabase_auth_user_id: string | null;
  legacy_clerk_user_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  plan: string | null;
  plan_type: string | null;
  stripe_customer_id: string | null;
  public_metadata: unknown;
  created_at: Date;
  updated_at: Date;
};

const USER_PROFILE_COLUMNS_SLIM = `
  app_document_mongo_id AS mongo_id,
  supabase_auth_user_id::text AS supabase_auth_user_id,
  legacy_clerk_user_id,
  email,
  first_name,
  last_name,
  image_url,
  plan,
  plan_type,
  stripe_customer_id,
  public_metadata,
  created_at,
  updated_at
`;

const USER_PROFILE_COLUMNS = `
  app_document_mongo_id AS mongo_id,
  legacy_body,
  supabase_auth_user_id::text AS supabase_auth_user_id,
  legacy_clerk_user_id,
  email,
  first_name,
  last_name,
  image_url,
  plan,
  plan_type,
  stripe_customer_id,
  public_metadata,
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

function parseUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return UUID_RE.test(t) ? t : null;
}

function applyPromotedUserProfileFields(row: UserProfileRow, doc: AppDoc): AppDoc {
  if (row.email) doc.email = row.email;
  if (row.first_name) doc.firstName = row.first_name;
  if (row.last_name) doc.lastName = row.last_name;
  if (row.image_url) doc.imageUrl = row.image_url;
  if (row.plan) doc.plan = row.plan;
  if (row.plan_type) doc.planType = row.plan_type;
  if (row.legacy_clerk_user_id) doc.clerkUserId = row.legacy_clerk_user_id;
  if (row.supabase_auth_user_id) {
    doc.supabaseUserId = row.supabase_auth_user_id;
    if (!doc.sub) doc.sub = row.supabase_auth_user_id;
  }
  if (row.stripe_customer_id) {
    const pm =
      doc.privateMetadata && typeof doc.privateMetadata === "object"
        ? (doc.privateMetadata as Record<string, unknown>)
        : {};
    doc.privateMetadata = { ...pm, stripeCustomerId: row.stripe_customer_id };
  }
  const meta = EJSON.deserialize(row.public_metadata ?? {});
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    doc.publicMetadata = meta;
  }
  if (row.created_at) doc.createdAt = row.created_at;
  if (row.updated_at) doc.updatedAt = row.updated_at;
  return doc;
}

function userProfileRowToDoc(row: UserProfileRow): AppDoc {
  if (row.legacy_body != null) {
    return applyPromotedUserProfileFields(row, rowToDocument(row.mongo_id, row.legacy_body));
  }

  const doc: AppDoc = {
    _id: OID_HEX.test(row.mongo_id) ? new ObjectId(row.mongo_id) : row.mongo_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return applyPromotedUserProfileFields(row, doc);
}

function mapRowsToDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    out.push(userProfileRowToDoc(r as UserProfileRow) as T);
  }
  return out;
}

function extractPromotedFields(doc: AppDoc) {
  const body = doc as Record<string, unknown>;
  const supabaseRaw =
    typeof body.supabaseUserId === "string"
      ? body.supabaseUserId
      : typeof body.sub === "string"
        ? body.sub
        : null;
  const supabaseUuid = parseUuid(supabaseRaw);
  const clerkId =
    typeof body.clerkUserId === "string" && body.clerkUserId.trim() !== ""
      ? body.clerkUserId.trim()
      : null;
  const pm =
    body.privateMetadata && typeof body.privateMetadata === "object"
      ? (body.privateMetadata as Record<string, unknown>)
      : null;
  const stripeCustomerId =
    pm && typeof pm.stripeCustomerId === "string" ? pm.stripeCustomerId.trim() : null;

  return {
    supabase_auth_user_id: supabaseUuid,
    legacy_clerk_user_id: clerkId,
    email: typeof body.email === "string" ? body.email.trim() || null : null,
    first_name: typeof body.firstName === "string" ? body.firstName.trim() || null : null,
    last_name: typeof body.lastName === "string" ? body.lastName.trim() || null : null,
    image_url: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
    plan: typeof body.plan === "string" ? body.plan.trim() || null : null,
    plan_type: typeof body.planType === "string" ? body.planType.trim() || null : null,
    stripe_customer_id: stripeCustomerId || null,
    public_metadata:
      body.publicMetadata && typeof body.publicMetadata === "object"
        ? body.publicMetadata
        : {},
  };
}

function userProfileDocToRow(doc: AppDoc, mongoId: string, updatedAt: Date): UserProfileRow {
  const legacySerialized = serializeDocument(doc) as Record<string, unknown>;
  const promoted = extractPromotedFields(doc);
  return {
    mongo_id: mongoId,
    legacy_body: legacySerialized,
    supabase_auth_user_id: promoted.supabase_auth_user_id,
    legacy_clerk_user_id: promoted.legacy_clerk_user_id,
    email: promoted.email,
    first_name: promoted.first_name,
    last_name: promoted.last_name,
    image_url: promoted.image_url,
    plan: promoted.plan,
    plan_type: promoted.plan_type,
    stripe_customer_id: promoted.stripe_customer_id,
    public_metadata: promoted.public_metadata,
    created_at: asDate(doc.createdAt, updatedAt),
    updated_at: updatedAt,
  };
}

function jsonPathSql(path: string): string {
  const parts = path.split(".");
  if (parts.length === 1) {
    return `legacy_body->>'${parts[0]!.replace(/'/g, "''")}'`;
  }
  const head = parts
    .slice(0, -1)
    .map((p) => `->'${p.replace(/'/g, "''")}'`)
    .join("");
  const leaf = parts[parts.length - 1]!.replace(/'/g, "''");
  return `legacy_body${head}->>'${leaf}'`;
}

function parseTimestampFilterOnColumn(
  columnSql: string,
  op: string,
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  const d = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  if (op === "$gte") {
    params.push(d);
    return { clause: `${columnSql} >= $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  if (op === "$lte") {
    params.push(d);
    return { clause: `${columnSql} <= $${paramIndex}`, nextIndex: paramIndex + 1 };
  }
  return null;
}

function filterBranchToSql(
  field: string,
  value: unknown,
  paramIndex: number,
  params: unknown[]
): { clause: string; nextIndex: number } | null {
  if (field === "_id") {
    const hex = objectIdLikeToHex(value);
    if (hex) {
      params.push(hex);
      return { clause: `app_document_mongo_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
    if (typeof value === "string") {
      params.push(value);
      return { clause: `app_document_mongo_id = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
    return null;
  }

  if (field === "supabaseUserId" || field === "sub") {
    if (typeof value !== "string") return null;
    const uuid = parseUuid(value);
    if (uuid) {
      params.push(value);
      return {
        clause: `supabase_auth_user_id = $${paramIndex}::uuid`,
        nextIndex: paramIndex + 1,
      };
    }
    params.push(value);
    const textP = paramIndex;
    return {
      clause: `(legacy_body->>'supabaseUserId' = $${textP} OR legacy_body->>'sub' = $${textP})`,
      nextIndex: paramIndex + 1,
    };
  }

  if (field === "clerkUserId") {
    if (typeof value !== "string") return null;
    params.push(value);
    return {
      clause: `legacy_clerk_user_id = $${paramIndex}`,
      nextIndex: paramIndex + 1,
    };
  }

  if (field === "plan") {
    if (typeof value === "string") {
      params.push(value);
      const p = paramIndex;
      return {
        clause: `(plan = $${p} OR legacy_body->>'plan' = $${p})`,
        nextIndex: paramIndex + 1,
      };
    }
    if (value && typeof value === "object" && "$in" in (value as object)) {
      const $in = (value as { $in: unknown[] }).$in;
      if (!Array.isArray($in) || $in.length === 0) {
        return { clause: "false", nextIndex: paramIndex };
      }
      const lowered = $in.map((v) => String(v).toLowerCase());
      params.push(lowered);
      return {
        clause: `(lower(trim(COALESCE(plan, legacy_body->>'plan', ''))) = ANY($${paramIndex}::text[]))`,
        nextIndex: paramIndex + 1,
      };
    }
    return null;
  }

  if (field === "createdAt" && value && typeof value === "object" && !Array.isArray(value)) {
    const ops = Object.entries(value as Record<string, unknown>);
    if (ops.length !== 1) return null;
    const [op, val] = ops[0]!;
    return parseTimestampFilterOnColumn("created_at", op, val, paramIndex, params);
  }

  if (field.includes(".")) {
    const pathSql = jsonPathSql(field);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const nestedParts: string[] = [];
      if ("$exists" in obj) {
        const exists = obj.$exists === true;
        nestedParts.push(
          exists
            ? `(${pathSql} IS NOT NULL AND nullif(trim(${pathSql}), '') IS NOT NULL)`
            : `(${pathSql} IS NULL OR nullif(trim(${pathSql}), '') IS NULL)`
        );
      }
      if ("$nin" in obj && Array.isArray(obj.$nin)) {
        const nin = obj.$nin;
        const literals = nin.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ");
        if (literals.length > 0) {
          nestedParts.push(`nullif(trim(${pathSql}), '') NOT IN (${literals})`);
        }
      }
      if (nestedParts.length > 0) {
        return { clause: `(${nestedParts.join(" AND ")})`, nextIndex: paramIndex };
      }
      const ops = Object.entries(value as Record<string, unknown>);
      if (ops.length === 1) {
        const [op, val] = ops[0]!;
        const d =
          val instanceof Date ? val : typeof val === "string" ? new Date(val) : null;
        if (!d || Number.isNaN(d.getTime())) return null;
        params.push(d);
        if (op === "$gte") {
          return { clause: `(${pathSql})::timestamptz >= $${paramIndex}`, nextIndex: paramIndex + 1 };
        }
        if (op === "$lte") {
          return { clause: `(${pathSql})::timestamptz <= $${paramIndex}`, nextIndex: paramIndex + 1 };
        }
      }
    }
    if (typeof value === "string") {
      params.push(value);
      return { clause: `${pathSql} = $${paramIndex}`, nextIndex: paramIndex + 1 };
    }
  }

  if (typeof value === "boolean") {
    const boolSql = value ? "'true'" : "'false'";
    return {
      clause: `(legacy_body->>'${field.replace(/'/g, "''")}' = ${boolSql})`,
      nextIndex: paramIndex,
    };
  }

  if (typeof value === "string") {
    params.push(value);
    return {
      clause: `(legacy_body->>'${field.replace(/'/g, "''")}' = $${paramIndex})`,
      nextIndex: paramIndex + 1,
    };
  }

  return null;
}

/** SQL filters for `public.user_profiles` (users collection). */
export function usersFilterToSql(filter: Record<string, unknown>): SqlParts | null {
  if (Object.keys(filter).length === 0) {
    return { clause: "true", params: [] };
  }

  if (Object.keys(filter).length === 1 && "$or" in filter) {
    const branches = (filter as { $or: unknown[] }).$or;
    if (!Array.isArray(branches) || branches.length === 0) {
      return { clause: "false", params: [] };
    }
    const parts: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;
    for (const branch of branches) {
      if (!branch || typeof branch !== "object" || Array.isArray(branch)) return null;
      const entries = Object.entries(branch as Record<string, unknown>);
      if (entries.length !== 1) return null;
      const [field, val] = entries[0]!;
      const parsed = filterBranchToSql(field, val, paramIndex, params);
      if (!parsed) return null;
      parts.push(parsed.clause);
      paramIndex = parsed.nextIndex;
    }
    return { clause: `(${parts.join(" OR ")})`, params };
  }

  const entries = Object.entries(filter);
  const parts: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [field, val] of entries) {
    if (field.startsWith("$")) return null;
    const parsed = filterBranchToSql(field, val, paramIndex, params);
    if (!parsed) return null;
    parts.push(parsed.clause);
    paramIndex = parsed.nextIndex;
  }

  if (parts.length === 0) return null;
  return { clause: parts.join(" AND "), params };
}

/** Slim `user_profiles` preload for mingo `$lookup` (no `legacy_body` blob). */
export async function loadUserProfilesForAggregateJoin(sql: Sql): Promise<AppDoc[]> {
  const rows = await sql`SELECT COUNT(*)::int AS c FROM public.user_profiles`;
  const n = rows[0]?.c ?? 0;
  const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
  if (n > budget) {
    throw new Error(
      `users $lookup preload needs ${n} rows (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
    );
  }
  const all = await sql.unsafe(
    `SELECT ${USER_PROFILE_COLUMNS_SLIM} FROM public.user_profiles ORDER BY app_document_mongo_id`,
    []
  );
  return mapRowsToDocs(all);
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
 * Postgres-backed `users` collection via `public.user_profiles`.
 */
export class PgUsersCollection<T extends AppDoc = AppDoc> {
  readonly collectionKey = "users";

  constructor(private readonly sql: Sql) {}

  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const rows = await this.sql.unsafe(
      `SELECT ${USER_PROFILE_COLUMNS} FROM public.user_profiles ORDER BY app_document_mongo_id LIMIT $1`,
      [rowLimit]
    );
    return mapRowsToDocs(rows).map((doc) => ({
      mongo_id: documentRowKey(doc),
      body: EJSON.serialize(doc),
    }));
  }

  private async countAll(): Promise<number> {
    const rows = await this.sql`SELECT COUNT(*)::int AS c FROM public.user_profiles`;
    return rows[0]?.c ?? 0;
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const sqlParts = usersFilterToSql(filter);
    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.user_profiles WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
      );
      return rows[0]?.c ?? 0;
    }
    if (sqlParts?.clause === "true") {
      return this.countAll();
    }
    return (await this.findDocuments(filter)).length;
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const sqlParts = usersFilterToSql(filter);
    const needsWideScan = sqlParts == null || sqlParts.clause === "true";

    if (needsWideScan) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan users (user_profiles) with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts && sqlParts.clause !== "true") {
      const rows = await this.sql.unsafe(
        `SELECT ${USER_PROFILE_COLUMNS_SLIM} FROM public.user_profiles WHERE ${sqlParts.clause} ORDER BY app_document_mongo_id`,
        sqlParts.params as never[]
      );
      return mapRowsToDocs<T>(rows);
    }

    const rows = await this.sql.unsafe(
      `SELECT ${USER_PROFILE_COLUMNS_SLIM} FROM public.user_profiles ORDER BY app_document_mongo_id`,
      []
    );
    const docs = mapRowsToDocs<T>(rows);
    const q = new Query(filter);
    return docs.filter((doc) => q.test(doc as never));
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

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId } = prepareInsertDocument(doc);
    const row = userProfileDocToRow(doc as AppDoc, mongoId, new Date());
    try {
      await this.sql`
        INSERT INTO public.user_profiles (
          supabase_auth_user_id,
          legacy_clerk_user_id,
          email,
          first_name,
          last_name,
          image_url,
          plan,
          plan_type,
          stripe_customer_id,
          public_metadata,
          legacy_body,
          app_document_mongo_id,
          created_at,
          updated_at
        )
        VALUES (
          ${row.supabase_auth_user_id},
          ${row.legacy_clerk_user_id},
          ${row.email},
          ${row.first_name},
          ${row.last_name},
          ${row.image_url},
          ${row.plan},
          ${row.plan_type},
          ${row.stripe_customer_id},
          ${this.sql.json(row.public_metadata as never)},
          ${this.sql.json(row.legacy_body as never)},
          ${row.mongo_id},
          ${row.created_at},
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
    const d = doc as AppDoc;
    const insertedId: ObjectId | string | number =
      d._id instanceof ObjectId
        ? d._id
        : typeof d._id === "string" || typeof d._id === "number" || typeof d._id === "bigint"
          ? d._id
          : OID_HEX.test(mongoId)
            ? new ObjectId(mongoId)
            : mongoId;
    return { acknowledged: true, insertedId };
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
    await this.updateOne(filter, update);
    const after = await this.findOne({ _id: before._id });
    return returnAfter ? (after as T | null) : (before as T);
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
      const mongoId = documentRowKey(next);
      const row = userProfileDocToRow(next, mongoId, now);
      await this.sql`
        UPDATE public.user_profiles
        SET
          supabase_auth_user_id = ${row.supabase_auth_user_id},
          legacy_clerk_user_id = ${row.legacy_clerk_user_id},
          email = ${row.email},
          first_name = ${row.first_name},
          last_name = ${row.last_name},
          image_url = ${row.image_url},
          plan = ${row.plan},
          plan_type = ${row.plan_type},
          stripe_customer_id = ${row.stripe_customer_id},
          public_metadata = ${this.sql.json(row.public_metadata as never)},
          legacy_body = ${this.sql.json(row.legacy_body as never)},
          created_at = ${row.created_at},
          updated_at = ${now}
        WHERE app_document_mongo_id = ${row.mongo_id}
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

  aggregate(pipeline: object[], _options?: { allowDiskUse?: boolean }): PgAggregateCursor {
    return new PgAggregateCursor(async () => {
      const joinShortNames = collectJoinCollectionShortNames(pipeline);
      const preload = new Map<string, AppDoc[]>();
      for (const short of joinShortNames) {
        if (short === "useractivities") {
          preload.set(short, await loadUserActivitiesForAggregateJoin(this.sql));
        } else if (short === "stripe_subscriptions") {
          const { loadStripeSubscriptionsForAggregateJoin } = await import(
            "./stripeSubscriptionsCollection"
          );
          preload.set(short, await loadStripeSubscriptionsForAggregateJoin(this.sql));
        }
      }

      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on users needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM.`
        );
      }
      const rows = await this.sql.unsafe(
        `SELECT ${USER_PROFILE_COLUMNS_SLIM} FROM public.user_profiles ORDER BY app_document_mongo_id`,
        []
      );
      const docs = mapRowsToDocs(rows);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: (name: string) => preload.get(name) ?? [],
      });
    });
  }
}
