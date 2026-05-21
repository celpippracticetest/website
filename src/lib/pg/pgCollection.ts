import { ObjectId } from "bson";
import { EJSON } from "bson";
import { Query, aggregate as mingoAggregate, update as mingoUpdate } from "mingo";
import type { Sql } from "postgres";
import { serializeDocument } from "./ejson";
import { documentFilterToSql } from "./whereBuilder";
import { prepareInsertDocument, rowToDocument, documentRowKey, type AppDoc } from "./document";

export type { AppDoc } from "./document";

function cloneDoc(doc: AppDoc): AppDoc {
  return EJSON.deserialize(EJSON.serialize(doc)) as AppDoc;
}

/** `postgres` rows can include sparse/undefined slots; never assume every element is a row object. */
function mapRowsToAppDocs<T extends AppDoc = AppDoc>(rows: unknown[]): T[] {
  const out: T[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    const row = r as { mongo_id?: unknown; body?: unknown };
    if (typeof row.mongo_id !== "string") continue;
    out.push(rowToDocument(row.mongo_id, row.body) as T);
  }
  return out;
}

/**
 * Mingo only supports a fixed set of update operators (no `$setOnInsert`).
 * Build a fresh object from own enumerable keys so nothing leaks through.
 */
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

/** Mingo does not implement `$setOnInsert`; apply it only for upsert inserts (document-store semantics). */
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

/** True when `documentFilterToSql` produced an unscoped partition read. */
function isCollectionOnlySqlClause(clause: string): boolean {
  return clause.replace(/\s+/g, " ").trim() === "collection = $1";
}

type PartitionBodyRow = { mongo_id: string; body: unknown };

const globalForAppDocCache = globalThis as typeof globalThis & {
  __appDocPartitionBodies?: Map<
    string,
    { expiresAt: number; rows: PartitionBodyRow[] }
  >;
};

/** TTL for full-partition reads (`WHERE collection = $1`). Set `0` to disable. */
function appDocumentsReadCacheTtlMs(): number {
  const raw = process.env.APP_DOCUMENTS_READ_CACHE_TTL_SEC?.trim();
  if (raw === "0") return 0;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n * 1000;
  }
  return 120_000;
}

function partitionBodyCache(): Map<
  string,
  { expiresAt: number; rows: PartitionBodyRow[] }
> {
  if (!globalForAppDocCache.__appDocPartitionBodies) {
    globalForAppDocCache.__appDocPartitionBodies = new Map();
  }
  return globalForAppDocCache.__appDocPartitionBodies;
}

function invalidatePartitionBodyCache(collectionKey: string): void {
  partitionBodyCache().delete(collectionKey);
}

function mapSqlRowsToPartitionBodies(rows: unknown[]): PartitionBodyRow[] {
  const out: PartitionBodyRow[] = [];
  for (const r of rows) {
    if (r == null || typeof r !== "object") continue;
    const row = r as { mongo_id?: unknown; body?: unknown };
    if (typeof row.mongo_id !== "string") continue;
    out.push({ mongo_id: row.mongo_id, body: row.body });
  }
  return out;
}

async function loadPartitionBodies(
  sql: Sql,
  collectionKey: string
): Promise<PartitionBodyRow[]> {
  const ttl = appDocumentsReadCacheTtlMs();
  const cache = partitionBodyCache();
  if (ttl > 0) {
    const hit = cache.get(collectionKey);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.rows;
    }
  }

  // ORDER BY mongo_id steers the planner to app_documents_pkey; bare
  // `WHERE collection = $1` can pick a partial index (e.g. useractivities_user) and scan far slower.
  const rows = await sql`
    SELECT mongo_id, body
    FROM app_documents
    WHERE collection = ${collectionKey}
    ORDER BY mongo_id
  `;
  const mapped = mapSqlRowsToPartitionBodies(rows);
  if (ttl > 0) {
    cache.set(collectionKey, { expiresAt: Date.now() + ttl, rows: mapped });
  }
  return mapped;
}

async function countAppDocumentsByCollection(sql: Sql, collectionKey: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM app_documents WHERE collection = ${collectionKey}
  `;
  return rows[0]?.c ?? 0;
}

/** Load an `app_documents` partition for mingo `$lookup` / `$unionWith` joins. */
export async function loadAppDocumentsJoinCollection(
  sql: Sql,
  logicalShortName: string
): Promise<AppDoc[]> {
  const key = await resolveAppDocumentsPartitionKey(sql, logicalShortName);
  const n = await countAppDocumentsByCollection(sql, key);
  if (n > maxScan()) {
    throw new Error(
      `Refusing to load "${key}" for aggregation join: ${n} rows exceeds APP_DOCUMENTS_MAX_SCAN=${maxScan()}.`
    );
  }
  const rows = await loadPartitionBodies(sql, key);
  return mapRowsToAppDocs(rows as unknown[]);
}

/** `prod.practices` → `practices` only when the prefix matches `env` and the rest is a single segment. */
function bareCollectionAfterEnvPrefix(prefixedLogical: string, env: string): string | null {
  const p = `${env}.`;
  if (!prefixedLogical.startsWith(p)) return null;
  const rest = prefixedLogical.slice(p.length);
  if (rest === "" || rest.includes(".")) return null;
  return rest;
}

/**
 * When `APP_DOCUMENTS_DB` points at `prod.*` but ETL only populated the default partition (`practices`),
 * read from the partition that actually has rows (prefer `prod.*` when both exist).
 */
async function resolvePinnedEnvPartition(
  sql: Sql,
  preferredKey: string,
  env: string
): Promise<string> {
  const nPref = await countAppDocumentsByCollection(sql, preferredKey);
  if (nPref > 0) return preferredKey;
  const bare = bareCollectionAfterEnvPrefix(preferredKey, env);
  if (!bare) return preferredKey;
  const nBare = await countAppDocumentsByCollection(sql, bare);
  if (nBare > 0) {
    if (process.env.NODE_ENV === "development" && !partitionFallbackWarned.has(preferredKey)) {
      partitionFallbackWarned.add(preferredKey);
      console.warn(
        `[celpip/pg] APP_DOCUMENTS_DB=${env} but "${preferredKey}" is empty; using "${bare}" (${nBare} rows). Re-run ETL with the same namespace (e.g. APP_DOCUMENTS_DB=${env}) so "${preferredKey}" is populated, or unset APP_DOCUMENTS_DB.`
      );
    }
    return bare;
  }
  return preferredKey;
}

/**
 * Maps a logical collection name (`tasks`, `practices`) to `app_documents.collection`
 * (`prod.tasks`, `practices`, …). Shared by {@link PgCollection} and aggregate `$lookup` preload
 * so joined collections resolve independently (tasks may live under `prod.*` while practices
 * stayed unprefixed after ETL).
 */
const resolvedPartitionCache = new Map<string, string>();

/** Dedupe dev warning when both `practices` and `prod.practices` resolution hit the same fallback. */
const partitionFallbackWarned = new Set<string>();

export async function resolveAppDocumentsPartitionKey(sql: Sql, logical: string): Promise<string> {
  const cached = resolvedPartitionCache.get(logical);
  if (cached !== undefined) return cached;

  const env = process.env.APP_DOCUMENTS_DB?.trim();

  // Physical key already namespaced (e.g. `prod.practices` from `db().collection("practices")`).
  if (logical.includes(".")) {
    const resolved =
      env != null && env !== ""
        ? await resolvePinnedEnvPartition(sql, logical, env)
        : logical;
    resolvedPartitionCache.set(logical, resolved);
    return resolved;
  }

  let resolved: string;
  if (env != null && env !== "") {
    resolved = await resolvePinnedEnvPartition(sql, `${env}.${logical}`, env);
  } else if (process.env.APP_DOCUMENTS_AUTO_PROBE !== "0") {
    // Prefer the unprefixed partition (default ETL: documents land under `practices`, not `prod.practices`).
    // Only fall back to `prod.<name>` when nothing exists unprefixed — that catches older
    // dumps produced when the ETL used a secondary namespace prefix.
    const nBare = await countAppDocumentsByCollection(sql, logical);
    if (nBare > 0) {
      resolved = logical;
    } else {
      const prefixed = `prod.${logical}`;
      const nPref = await countAppDocumentsByCollection(sql, prefixed);
      if (nPref > 0) {
        if (process.env.NODE_ENV === "development" && !partitionFallbackWarned.has(logical)) {
          partitionFallbackWarned.add(logical);
          console.info(
            `[celpip/pg] "${logical}" empty; falling back to "${prefixed}" (${nPref} rows). Re-run ETL so the unprefixed partition is the source of truth (or align APP_DOCUMENTS_DB with where data was written).`
          );
        }
        resolved = prefixed;
      } else {
        resolved = logical;
      }
    }
  } else {
    resolved = logical;
  }

  resolvedPartitionCache.set(logical, resolved);
  return resolved;
}

/** Collect short collection names referenced by stages that need `collectionResolver` in mingo. */
export function collectJoinCollectionShortNames(pipeline: unknown): Set<string> {
  const names = new Set<string>();
  function add(n: unknown) {
    if (typeof n === "string" && n.length > 0) names.add(n);
  }
  function walk(stages: unknown) {
    if (!Array.isArray(stages)) return;
    for (const stage of stages) {
      if (!stage || typeof stage !== "object") continue;
      const s = stage as Record<string, unknown>;
      const lookup = s.$lookup;
      if (lookup && typeof lookup === "object" && !Array.isArray(lookup)) {
        const lu = lookup as Record<string, unknown>;
        add(lu.from);
        if (Array.isArray(lu.pipeline)) walk(lu.pipeline);
      }
      const uw = s.$unionWith;
      if (uw != null) {
        if (typeof uw === "string") add(uw);
        else if (typeof uw === "object" && !Array.isArray(uw)) {
          add((uw as Record<string, unknown>).coll);
          const sub = (uw as Record<string, unknown>).pipeline;
          if (Array.isArray(sub)) walk(sub);
        }
      }
      const graph = s.$graphLookup;
      if (graph && typeof graph === "object" && !Array.isArray(graph)) {
        const g = graph as Record<string, unknown>;
        add(g.from);
        if (Array.isArray(g.pipeline)) walk(g.pipeline);
      }
      const facet = s.$facet;
      if (facet && typeof facet === "object" && facet !== null && !Array.isArray(facet)) {
        for (const sub of Object.values(facet as Record<string, unknown>)) {
          if (Array.isArray(sub)) walk(sub);
        }
      }
    }
  }
  walk(pipeline);
  return names;
}

export class PgAggregateCursor {
  constructor(private readonly run: () => Promise<unknown[]>) {}

  async toArray(): Promise<unknown[]> {
    return this.run();
  }

  /** First row only (Mongo cursor compatibility; pipeline re-runs each call). */
  async next(): Promise<unknown | null> {
    const rows = await this.run();
    return rows[0] ?? null;
  }
}

export class PgCollection<T extends AppDoc = AppDoc> {
  /** Cached `app_documents.collection` (e.g. `prod.tasks`). */
  private resolvedPhysicalKey: string | null = null;

  constructor(
    private readonly sql: Sql,
    readonly collectionKey: string
  ) {}

  /**
   * Maps logical collection name from `db().collection("tasks")` to the row prefix in Postgres.
   * Uses `APP_DOCUMENTS_DB` when set; otherwise (unless `APP_DOCUMENTS_AUTO_PROBE=0`) prefers
   * `prod.<name>` when that partition has rows, matching ETL runs that used a namespace prefix.
   */
  async resolvePhysicalCollectionKey(): Promise<string> {
    if (this.resolvedPhysicalKey !== null) return this.resolvedPhysicalKey;
    this.resolvedPhysicalKey = await resolveAppDocumentsPartitionKey(this.sql, this.collectionKey);
    return this.resolvedPhysicalKey;
  }

  /** Fast path for `PgFindCursor` when the filter is empty. */
  async scanRawDocuments(rowLimit: number): Promise<{ mongo_id: string; body: unknown }[]> {
    const key = await this.resolvePhysicalCollectionKey();
    const rows = await this.sql`
      SELECT mongo_id, body
      FROM app_documents
      WHERE collection = ${key}
      ORDER BY mongo_id
      LIMIT ${rowLimit}
    `;
    return mapSqlRowsToPartitionBodies(rows);
  }

  private async countAll(): Promise<number> {
    const key = await this.resolvePhysicalCollectionKey();
    const rows = await this.sql`
      SELECT COUNT(*)::int AS c FROM app_documents WHERE collection = ${key}
    `;
    return rows[0]?.c ?? 0;
  }

  private async countDocumentsForCollectionKey(collectionKey: string): Promise<number> {
    return countAppDocumentsByCollection(this.sql, collectionKey);
  }

  /** Full scan of another `app_documents.collection` key (for mingo `$lookup` / `$unionWith`). */
  private async loadAllDocumentsForCollectionKey(collectionKey: string): Promise<AppDoc[]> {
    const n = await this.countDocumentsForCollectionKey(collectionKey);
    if (n > maxScan()) {
      throw new Error(
        `Refusing to load "${collectionKey}" for aggregation join ($lookup / $unionWith / …): ${n} rows exceeds APP_DOCUMENTS_MAX_SCAN=${maxScan()}.`
      );
    }
    const rows = await loadPartitionBodies(this.sql, collectionKey);
    return mapRowsToAppDocs(rows as unknown[]);
  }

  async findDocuments(filter: Record<string, unknown>): Promise<T[]> {
    const phys = await this.resolvePhysicalCollectionKey();
    const sqlParts = documentFilterToSql(phys, filter);
    // `countAll()` hits the whole partition — avoid it when the filter already narrows in SQL
    // (e.g. answers by practiceId + userId). Unscoped `collection = $1` still needs the guard.
    const needsPartitionWideGuard =
      sqlParts == null ||
      isCollectionOnlySqlClause(sqlParts.clause);
    if (needsPartitionWideGuard) {
      const n = await this.countAll();
      if (n > maxScan()) {
        throw new Error(
          `Refusing to scan collection "${this.collectionKey}" with ${n} rows (APP_DOCUMENTS_MAX_SCAN=${maxScan()}).`
        );
      }
    }

    if (sqlParts) {
      if (isCollectionOnlySqlClause(sqlParts.clause)) {
        const rows = await loadPartitionBodies(this.sql, phys);
        return mapRowsToAppDocs<T>(rows);
      }
      const rows = await this.sql.unsafe(
        `SELECT mongo_id, body FROM app_documents WHERE ${sqlParts.clause} ORDER BY mongo_id`,
        sqlParts.params as never[]
      );
      return mapRowsToAppDocs<T>(rows);
    }

    const rows = await loadPartitionBodies(this.sql, phys);
    const q = new Query(filter);
    return mapRowsToAppDocs<T>(rows as unknown[]).filter((doc) => q.test(doc as never));
  }

  find<T extends AppDoc = AppDoc>(
    filter: Record<string, unknown> = {},
    _options?: unknown
  ): PgFindCursor<T> {
    return new PgFindCursor<T>(this, filter);
  }

  async findOne<T extends AppDoc = AppDoc>(
    filter: Record<string, unknown> = {},
    options?: { projection?: Record<string, 0 | 1>; sort?: Record<string, 1 | -1> }
  ): Promise<T | null> {
    const cursor = new PgFindCursor<T>(this, filter);
    if (options?.projection) cursor.project(options.projection);
    if (options?.sort) cursor.sort(options.sort);
    cursor.limit(1);
    const arr = await cursor.toArray();
    return (arr[0] ?? null) as T | null;
  }

  async insertOne(doc: unknown): Promise<{
    acknowledged: boolean;
    insertedId: ObjectId | string | number;
  }> {
    const { mongoId, bodySerialized } = prepareInsertDocument(doc);
    const phys = await this.resolvePhysicalCollectionKey();
    try {
      await this.sql`
        INSERT INTO app_documents (collection, mongo_id, body, updated_at)
        VALUES (
          ${phys},
          ${mongoId},
          ${bodySerialized as object},
          now()
        )
      `;
      invalidatePartitionBodyCache(phys);
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

  async insertMany(docs: unknown[], options?: { ordered?: boolean }): Promise<{
    acknowledged: boolean;
    insertedCount: number;
    insertedIds: Record<number, ObjectId | string | number>;
  }> {
    const ordered = options?.ordered !== false;
    const insertedIds: Record<number, ObjectId | string | number> = {};
    let count = 0;
    for (let i = 0; i < docs.length; i++) {
      try {
        const r = await this.insertOne(docs[i]);
        insertedIds[i] = r.insertedId;
        count++;
      } catch (e) {
        if (ordered) throw e;
      }
    }
    return { acknowledged: true, insertedCount: count, insertedIds };
  }

  async replaceOne(filter: Record<string, unknown>, replacement: unknown): Promise<{
    acknowledged: boolean;
    matchedCount: number;
    modifiedCount: number;
  }> {
    const found = await this.findOne(filter);
    if (!found) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }
    const id = documentRowKey(found);
    const { bodySerialized } = prepareInsertDocument({
      ...(replacement as object),
      _id: found._id,
    });
    const phys = await this.resolvePhysicalCollectionKey();
    await this.sql`
      UPDATE app_documents
      SET body = ${bodySerialized as object}, updated_at = now()
      WHERE collection = ${phys} AND mongo_id = ${id}
    `;
    invalidatePartitionBodyCache(phys);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
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
        // Upsert semantics: $setOnInsert fields form the base document, then $inc/$set apply.
        // Applying $setOnInsert after $inc would reset totals (e.g. totalPoints back to 0).
        applySetOnInsert(next, update);
        runMingoUpdate(next, update);
        await this.insertOne(next);
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }

    const targets = many ? matches : [matches[0]];
    let modified = 0;
    const phys = await this.resolvePhysicalCollectionKey();
    for (const doc of targets) {
      const id = documentRowKey(doc);
      const next = cloneDoc(doc);
      runMingoUpdate(next, update);
      const bodySerialized = serializeDocument(next);
      await this.sql`
        UPDATE app_documents
        SET body = ${bodySerialized as object}, updated_at = now()
        WHERE collection = ${phys} AND mongo_id = ${id}
      `;
      modified++;
    }
    if (modified > 0) {
      invalidatePartitionBodyCache(phys);
    }
    return {
      acknowledged: true,
      matchedCount: targets.length,
      modifiedCount: modified,
      upsertedCount: 0,
    };
  }

  async deleteOne(filter: Record<string, unknown>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const found = await this.findOne(filter);
    if (!found) return { acknowledged: true, deletedCount: 0 };
    const id = documentRowKey(found);
    const phys = await this.resolvePhysicalCollectionKey();
    await this.sql`
      DELETE FROM app_documents WHERE collection = ${phys} AND mongo_id = ${id}
    `;
    invalidatePartitionBodyCache(phys);
    return { acknowledged: true, deletedCount: 1 };
  }

  async deleteMany(filter: Record<string, unknown>): Promise<{ acknowledged: boolean; deletedCount: number }> {
    const matches = await this.findDocuments(filter);
    const phys = await this.resolvePhysicalCollectionKey();
    let n = 0;
    for (const doc of matches) {
      const id = documentRowKey(doc);
      await this.sql`
        DELETE FROM app_documents WHERE collection = ${phys} AND mongo_id = ${id}
      `;
      n++;
    }
    if (n > 0) {
      invalidatePartitionBodyCache(phys);
    }
    return { acknowledged: true, deletedCount: n };
  }

  async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
    const phys = await this.resolvePhysicalCollectionKey();
    const sqlParts = documentFilterToSql(phys, filter);
    if (sqlParts) {
      const rows = await this.sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM app_documents WHERE ${sqlParts.clause}`,
        sqlParts.params as never[]
      );
      return rows[0]?.c ?? 0;
    }
    if (Object.keys(filter).length === 0) {
      return this.countAll();
    }
    return (await this.findDocuments(filter)).length;
  }

  async distinct(field: string, filter: Record<string, unknown> = {}): Promise<unknown[]> {
    const docs = await this.findDocuments(filter);
    const parts = field.split(".");
    const set = new Set<string>();
    for (const d of docs) {
      let cur: unknown = d;
      for (const p of parts) {
        cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[p] : undefined;
      }
      if (cur !== undefined && cur !== null) set.add(String(cur));
    }
    return [...set];
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
        return returnAfter ? created : null;
      }
      return null;
    }
    await this.updateOne(filter, update);
    const after = await this.findOne({ _id: before._id });
    return returnAfter ? after : before;
  }

  aggregate(pipeline: object[], _options?: { allowDiskUse?: boolean }): PgAggregateCursor {
    return new PgAggregateCursor(async () => {
      const baseKey = await this.resolvePhysicalCollectionKey();
      const joinShortNames = collectJoinCollectionShortNames(pipeline);
      const preload = new Map<string, AppDoc[]>();
      for (const short of joinShortNames) {
        if (short === "useractivities") {
          const { loadUserActivitiesForAggregateJoin } = await import(
            "./userActivitiesCollection"
          );
          preload.set(short, await loadUserActivitiesForAggregateJoin(this.sql));
          continue;
        }
        if (short === "answers") {
          const { loadAnswersForAggregateJoin } = await import("./answersCollection");
          preload.set(short, await loadAnswersForAggregateJoin(this.sql));
          continue;
        }
        if (short === "stripe_subscriptions") {
          const { loadStripeSubscriptionsForAggregateJoin } = await import(
            "./stripeSubscriptionsCollection"
          );
          preload.set(short, await loadStripeSubscriptionsForAggregateJoin(this.sql));
          continue;
        }
        if (short === "users") {
          const { loadUserProfilesForAggregateJoin } = await import("./usersCollection");
          preload.set(short, await loadUserProfilesForAggregateJoin(this.sql));
          continue;
        }
        const key = await resolveAppDocumentsPartitionKey(this.sql, short);
        preload.set(short, await this.loadAllDocumentsForCollectionKey(key));
      }

      const n = await this.countAll();
      const budget = Number(process.env.APP_AGGREGATE_DOC_BUDGET || maxScan());
      if (n > budget) {
        throw new Error(
          `Aggregate on "${this.collectionKey}" needs ${n} documents (budget ${budget}). Raise APP_AGGREGATE_DOC_BUDGET after sizing RAM, or narrow the pipeline.`
        );
      }
      const rows = await loadPartitionBodies(this.sql, baseKey);
      const docs = mapRowsToAppDocs(rows as unknown[]);
      return mingoAggregate(docs, pipeline as never[], {
        collectionResolver: (name: string) => preload.get(name) ?? [],
      });
    });
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
    return "noop_pg_index";
  }
}

export class PgFindCursor<T extends AppDoc = AppDoc> {
  private sortSpec: Record<string, 1 | -1> | null = null;
  private skipN = 0;
  private limitN: number | null = null;
  private projectSpec: Record<string, 0 | 1> | null = null;

  constructor(
    private readonly coll: PgCollection<T>,
    private readonly filter: Record<string, unknown>
  ) {}

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }

  skip(n: number): this {
    this.skipN = n;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  project(spec: Record<string, 0 | 1>): this {
    this.projectSpec = spec;
    return this;
  }

  private applyProjection(doc: T): T {
    if (!this.projectSpec) return doc;
    const out: Record<string, unknown> = {};
    const d = doc as Record<string, unknown>;
    for (const [k, v] of Object.entries(this.projectSpec)) {
      if (v !== 1) continue;
      if (k.includes(".")) {
        const parts = k.split(".");
        let cur: unknown = d;
        for (const p of parts) {
          cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[p] : undefined;
        }
        let target: Record<string, unknown> = out;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i]!;
          target[p] ??= {};
          target = target[p] as Record<string, unknown>;
        }
        target[parts[parts.length - 1]!] = cur;
      } else if (k in d) {
        out[k] = d[k];
      }
    }
    if (this.projectSpec._id === 1 || !("_id" in this.projectSpec)) {
      out._id = doc._id;
    }
    return out as T;
  }

  private applySort(docs: T[]): T[] {
    if (!this.sortSpec) return docs;
    const entries = Object.entries(this.sortSpec);
    return [...docs].sort((a, b) => {
      for (const [key, dir] of entries) {
        const av = (a as Record<string, unknown>)[key];
        const bv = (b as Record<string, unknown>)[key];
        if (av === bv) continue;
        const c = av < bv ? -1 : 1;
        return dir === -1 ? -c : c;
      }
      return 0;
    });
  }

  /** Compatibility cursor: returns first remaining document (uses limit 1 semantics). */
  async next(): Promise<T | null> {
    const arr = await this.toArray();
    return arr[0] ?? null;
  }

  async toArray(): Promise<T[]> {
    let docs: T[];

    const filterEmpty = Object.keys(this.filter).length === 0;
    if (filterEmpty && !this.sortSpec && this.limitN != null) {
      const rows = await this.coll.scanRawDocuments(this.skipN + this.limitN);
      const sliced = rows.slice(this.skipN);
      docs = mapRowsToAppDocs<T>(sliced);
    } else {
      docs = await this.coll.findDocuments(this.filter as Record<string, unknown>);
      docs = this.applySort(docs);
      docs = docs.slice(
        this.skipN,
        this.limitN != null ? this.skipN + this.limitN : undefined
      );
    }
    return docs.map((d) => this.applyProjection(d));
  }
}

function isPgUniqueViolation(e: unknown): boolean {
  return Boolean(
    e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "23505"
  );
}
