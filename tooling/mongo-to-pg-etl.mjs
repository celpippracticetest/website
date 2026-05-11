/**
 * Copy all documents from MongoDB (default DB + optional secondary) into Postgres `app_documents`.
 * Usage:
 *   MONGODB_URI=... DATABASE_URL=... node tooling/mongo-to-pg-etl.mjs
 * Optional:
 *   MONGODB_SECONDARY_DB=prod   # also copies db("prod") using collection keys "prod.<name>"
 *
 * Cutover (website):
 *   1) Apply supabase/migrations on the Supabase project (SQL editor or `supabase db push`).
 *   2) Run this ETL against staging, verify counts, then production.
 *   3) Set DATABASE_URL (pooler) on Vercel/hosting; if you used MONGODB_SECONDARY_DB, set APP_DOCUMENTS_DB to the same name on the website so client.db() hits prod.* keys.
 *      Remove MONGODB_URI from the website runtime when dual-write is no longer needed.
 *   4) Tune APP_AGGREGATE_DOC_BUDGET / APP_DOCUMENTS_MAX_SCAN if large aggregates hit limits.
 *
 * When run via `npm run etl:mongo-to-pg`, `.env` / `.env.local` in the website root are loaded first.
 *
 * Incremental (only rows not yet in Postgres for each collection):
 *   ETL_INCREMENTAL=1 npm run etl:mongo-to-pg
 *   npm run etl:mongo-to-pg:incremental
 *   node ./tooling/mongo-to-pg-etl.mjs --incremental
 * Use `node ... --full` to force a full upsert even if ETL_INCREMENTAL is set in .env.
 * Incremental mode does not delete PG rows removed from Mongo; run a full sync if you need deletes mirrored.
 *
 * Limit to specific Mongo collection names (not the Postgres `prod.*` prefix — use the Mongo name, e.g. `blogs`):
 *   node ./tooling/mongo-to-pg-etl.mjs --incremental --only=blogs
 *   node ./tooling/mongo-to-pg-etl.mjs --incremental --only=plans
 *   node ./tooling/mongo-to-pg-etl.mjs --only=blogs,wikiArticles
 *   npm run etl:mongo-to-pg:incremental:blogs
 *   npm run etl:mongo-to-pg:incremental:plans
 * If `MONGODB_SECONDARY_DB` is set, each `--only` name is still synced from that DB too (`prod.blogs`, etc.).
 *
 * Answers collection (large): by default only Mongo documents from the last **3 calendar months** are read
 * (`createdAt` or `updatedAt` >= cutoff). Override with `ETL_ANSWERS_RECENT_MONTHS` (number; `0` / `all` = no
 * filter), `--full-answers`, or `--answers-recent-months=N`.
 *
 * Postgres: `postgres` defaults to recycling connections every ~30–60 minutes (`max_lifetime`), which can
 * surface as `read ECONNRESET` on long ETLs. This script disables that and retries transient socket errors.
 * For huge loads, prefer a direct session URL (port 5432) over the Supabase pooler (6543) if the pooler
 * still drops connections.
 */
import { MongoClient } from "mongodb";
import dns from "node:dns";
import postgres from "postgres";
import {
  EJSON,
  ObjectId,
  Long,
  Decimal128,
  Binary,
  Timestamp,
  MinKey,
  MaxKey,
  BSONRegExp,
  Code,
  Double,
  Int32,
  DBRef,
  BSONSymbol,
} from "bson";
import { loadRepoEnv } from "./load-repo-env.mjs";
import { mongoIdToString } from "./mongo-id-to-string.mjs";

loadRepoEnv();

function configureDnsServers() {
  const servers = process.env.NODE_DNS_SERVERS?.split(",").map((server) => server.trim()).filter(Boolean);
  if (!servers?.length) return;

  dns.setServers(servers);
  console.log(`Using custom Node DNS server(s): ${servers.join(", ")}`);
}

configureDnsServers();

function truthyEnv(value) {
  if (value == null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

const incremental =
  !process.argv.includes("--full") &&
  (truthyEnv(process.env.ETL_INCREMENTAL) || process.argv.includes("--incremental"));

/** Mongo `answers` time window: 0 = all time; default 3 months if unset. */
function parseAnswersRecentMonths() {
  if (process.argv.includes("--full-answers")) return 0;
  const arg = process.argv.find((a) => a.startsWith("--answers-recent-months="));
  if (arg) {
    const n = Number(String(arg).slice("--answers-recent-months=".length));
    if (!Number.isFinite(n) || n < 0) return 3;
    return n;
  }
  const v = process.env.ETL_ANSWERS_RECENT_MONTHS?.trim().toLowerCase();
  if (v === "0" || v === "all" || v === "off" || v === "false") return 0;
  if (!v) return 3;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 3;
  return n;
}

const answersRecentMonths = parseAnswersRecentMonths();

/** If set, only these Mongo collection names are copied (default DB and secondary, if configured). */
function parseOnlyCollections() {
  const argEq = process.argv.find((a) => a.startsWith("--only="));
  if (argEq !== undefined) {
    const rest = String(argEq).slice("--only=".length).trim();
    if (rest === "") {
      console.error(
        "Invalid --only=: pass a comma-separated list of Mongo collection names (e.g. --only=blogs)."
      );
      process.exit(1);
    }
    return rest
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const idx = process.argv.indexOf("--only");
  if (idx !== -1) {
    const next = process.argv[idx + 1];
    if (!next || next.startsWith("-")) {
      console.error("Missing collection name after --only (e.g. `--only blogs` or `--only=blogs`).");
      process.exit(1);
    }
    return next
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return null;
}

const onlyCollections = parseOnlyCollections();

const mongoUri = process.env.MONGODB_URI;
const databaseUrl = process.env.DATABASE_URL;
if (!mongoUri || !databaseUrl) {
  console.error(
    "Missing MONGODB_URI and/or DATABASE_URL after loading .env and .env.local from the website root."
  );
  console.error("Add both to .env (or export them in the shell), then run: npm run etl:mongo-to-pg");
  process.exit(1);
}

const secondary = process.env.MONGODB_SECONDARY_DB?.trim();

/**
 * The MongoDB driver bundles its own BSON runtime. Top-level `bson` 7.x `EJSON.serialize`
 * rejects nested values from that tree (`BSONVersionError`). Rebuild known BSON shapes
 * with this package's constructors so serialization is stable.
 */
function normalizeForEjson(value) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((x) => normalizeForEjson(x));

  const tag = value._bsontype;
  if (typeof tag === "string") {
    switch (tag) {
      case "ObjectId":
        return ObjectId.createFromHexString(value.toHexString());
      case "Long":
        return Long.fromBits(value.low, value.high, Boolean(value.unsigned));
      case "Int32":
        return new Int32(value.valueOf());
      case "Double":
        return new Double(value.valueOf());
      case "Decimal128":
        return Decimal128.fromString(value.toString());
      case "Binary":
        return new Binary(value.buffer, value.subType ?? value.sub_type ?? 0);
      case "Timestamp":
        return Timestamp.fromBits(value.low, value.high);
      case "MinKey":
        return new MinKey();
      case "MaxKey":
        return new MaxKey();
      case "BSONRegExp":
        return new BSONRegExp(value.pattern, value.options);
      case "Code":
        return new Code(value.code, value.scope != null ? normalizeForEjson(value.scope) : undefined);
      case "DBRef":
        return new DBRef(
          value.namespace,
          normalizeForEjson(value.oid),
          value.db != null ? String(value.db) : undefined
        );
      case "BSONSymbol":
        return new BSONSymbol(value.value);
      default:
        break;
    }
  }

  const out = {};
  for (const k of Object.keys(value)) {
    out[k] = normalizeForEjson(value[k]);
  }
  return out;
}

function serializeDoc(doc) {
  return EJSON.serialize(normalizeForEjson(doc), { relaxed: false });
}

/** Cutoff for "last N calendar months" in UTC (Mongo stores BSON dates). */
function utcMonthsAgo(months) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

/** Restrict `answers` scans to recent activity (same collection for default + secondary DB). */
function buildAnswersMongoFilter(recentMonths) {
  if (!recentMonths || recentMonths <= 0) return {};
  const cutoff = utcMonthsAgo(recentMonths);
  return {
    $or: [{ createdAt: { $gte: cutoff } }, { updatedAt: { $gte: cutoff } }],
  };
}

function isPgbouncerUrl(url) {
  return (
    url.includes("pooler.supabase.com") ||
    url.includes(":6543") ||
    /[?&]pgbouncer=true/i.test(url)
  );
}

/** Options tuned for long sequential bulk upserts (avoid client-side connection recycle + pooler quirks). */
function createSqlClient(databaseUrl) {
  const local = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
  return postgres(databaseUrl, {
    max: 1,
    ssl: local ? false : "require",
    max_lifetime: 0,
    idle_timeout: 0,
    connect_timeout: 60,
    prepare: !isPgbouncerUrl(databaseUrl),
    connection: { application_name: "mongo-to-pg-etl" },
  });
}

function isTransientPostgresError(err) {
  const c = err?.code;
  if (typeof c !== "string") return false;
  if (c === "ECONNRESET" || c === "EPIPE" || c === "ETIMEDOUT") return true;
  if (c === "CONNECTION_DESTROYED" || c === "CONNECTION_ENDED") return true;
  // SQLSTATE class 08 — connection exception (e.g. server / proxy closed link)
  if (c.length === 5 && c.startsWith("08")) return true;
  return false;
}

/** Existing mongo_id hex strings for one logical collection (uses PK index on collection, mongo_id). */
async function loadExistingMongoIds(sql, collectionKey) {
  const ids = new Set();
  const pageSize = 50_000;
  let last = "";
  while (true) {
    const rows =
      last === ""
        ? await sql`
            SELECT mongo_id FROM app_documents
            WHERE collection = ${collectionKey}
            ORDER BY mongo_id
            LIMIT ${pageSize}
          `
        : await sql`
            SELECT mongo_id FROM app_documents
            WHERE collection = ${collectionKey}
              AND mongo_id > ${last}
            ORDER BY mongo_id
            LIMIT ${pageSize}
          `;
    if (!rows.length) break;
    for (const row of rows) ids.add(row.mongo_id);
    last = rows[rows.length - 1].mongo_id;
    if (rows.length < pageSize) break;
  }
  return ids;
}

async function upsertDocument(sql, collectionKey, mongoId, body) {
  const maxAttempts = 10;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      await sql`
        INSERT INTO app_documents (collection, mongo_id, body, updated_at)
        VALUES (${collectionKey}, ${mongoId}, ${sql.json(body)}, now())
        ON CONFLICT (collection, mongo_id) DO UPDATE SET
          body = EXCLUDED.body,
          updated_at = now()
      `;
      return;
    } catch (err) {
      if (attempt >= maxAttempts || !isTransientPostgresError(err)) throw err;
      const delayMs = Math.min(30_000, 400 * 2 ** (attempt - 1));
      console.warn(
        `  Postgres transient error (${collectionKey} ${mongoId}): ${err.code || err.message} — retry ${attempt}/${maxAttempts} in ${delayMs}ms`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function copyDatabase(mongoClient, sql, dbName, keyPrefix, restrictNames) {
  const db = dbName ? mongoClient.db(dbName) : mongoClient.db();
  const cols = await db.listCollections().toArray();
  for (const c of cols) {
    const name = c.name;
    if (restrictNames && !restrictNames.includes(name)) {
      continue;
    }
    const coll = db.collection(name);
    const collectionKey = keyPrefix ? `${keyPrefix}.${name}` : name;
    const answersFilter =
      name === "answers" && answersRecentMonths > 0 ? buildAnswersMongoFilter(answersRecentMonths) : {};
    const modeLabel = incremental ? "incremental" : "full";
    const answersLabel =
      name === "answers" && answersRecentMonths > 0
        ? `, Mongo last ${answersRecentMonths} mo (createdAt/updatedAt)`
        : "";
    console.log(`Copying ${collectionKey} (${modeLabel}${answersLabel}) …`);
    let existing = null;
    if (incremental) {
      console.log(`  ${collectionKey}: loading existing mongo_id from Postgres …`);
      existing = await loadExistingMongoIds(sql, collectionKey);
      console.log(`  ${collectionKey}: ${existing.size} row(s) already in PG`);
    }
    const cursor = coll.find(answersFilter, { batchSize: 500 });
    let upserted = 0;
    let skipped = 0;
    let scanned = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc?._id) continue;
      const mongoId = mongoIdToString(doc._id);
      scanned++;
      if (incremental && existing.has(mongoId)) {
        skipped++;
        if (scanned % 5000 === 0) {
          console.log(`  ${collectionKey}: scanned ${scanned} (${upserted} upserted, ${skipped} skipped)`);
        }
        continue;
      }
      let body;
      try {
        body = serializeDoc(doc);
      } catch (err) {
        console.error(`  BSON/EJSON serialize failed (${collectionKey}, mongo_id=${mongoId}):`, err?.message ?? err);
        throw err;
      }
      await upsertDocument(sql, collectionKey, mongoId, body);
      upserted++;
      if (upserted % 2000 === 0) console.log(`  ${collectionKey}: ${upserted} upserted (${skipped} skipped)`);
    }
    if (incremental) {
      console.log(`  ${collectionKey}: done (scanned ${scanned}, ${upserted} upserted, ${skipped} skipped)`);
    } else {
      console.log(`  ${collectionKey}: done (${upserted} docs)`);
    }
  }
}

const mongoClient = new MongoClient(mongoUri);
const sql = createSqlClient(databaseUrl);

await mongoClient.connect();
if (incremental) {
  console.log("ETL mode: incremental (skip mongo_id already present in app_documents per collection).");
}
if (onlyCollections?.length) {
  console.log(`ETL scope: only Mongo collection(s): ${onlyCollections.join(", ")}`);
}
if (answersRecentMonths > 0) {
  const cutoff = utcMonthsAgo(answersRecentMonths).toISOString();
  console.log(
    `Answers window: last ${answersRecentMonths} month(s) (Mongo createdAt/updatedAt >= ${cutoff}). Use ETL_ANSWERS_RECENT_MONTHS=0 or --full-answers for all answers.`
  );
}
try {
  await copyDatabase(mongoClient, sql, null, null, onlyCollections);
  if (secondary) {
    await copyDatabase(mongoClient, sql, secondary, secondary, onlyCollections);
  }
  console.log(`ETL finished (${incremental ? "incremental" : "full"}).`);
} finally {
  await mongoClient.close();
  await sql.end({ timeout: 10 });
}
