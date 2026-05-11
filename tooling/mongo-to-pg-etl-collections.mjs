/**
 * Focused ETL: copy a specific list of Mongo collections (default DB) into Postgres
 * `app_documents`. Useful when the full ETL is busy on `answers` and you need to
 * top-up specific collections quickly (e.g. `exams`, `exam-parts`, `users`).
 *
 * Usage:
 *   node tooling/mongo-to-pg-etl-collections.mjs exams exam-parts users
 *   COLLECTIONS=exams,exam-parts,users node tooling/mongo-to-pg-etl-collections.mjs
 *
 * Modes:
 *   --full          force full re-upsert (default: incremental).
 *   --incremental   incremental (default).
 *
 * Requires DATABASE_URL and MONGODB_URI in `.env` / `.env.local`.
 */
import { MongoClient } from "mongodb";
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

const argList = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const envList = (process.env.COLLECTIONS ?? "").split(/[,\s]+/).filter(Boolean);
const collections = [...new Set([...envList, ...argList])];
if (collections.length === 0) {
  console.error(
    "Pass collection names as args or COLLECTIONS=… (e.g. node tooling/mongo-to-pg-etl-collections.mjs exams exam-parts users)"
  );
  process.exit(1);
}

const incremental = !process.argv.includes("--full");

const mongoUri = process.env.MONGODB_URI;
const databaseUrl = process.env.DATABASE_URL;
if (!mongoUri || !databaseUrl) {
  console.error("Set MONGODB_URI and DATABASE_URL.");
  process.exit(1);
}

function normalizeForEjson(value) {
  if (value == null) return value;
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
  for (const k of Object.keys(value)) out[k] = normalizeForEjson(value[k]);
  return out;
}

function serializeDoc(doc) {
  return EJSON.serialize(normalizeForEjson(doc), { relaxed: false });
}

function isPgbouncerUrl(url) {
  return url.includes("pooler.supabase.com") || url.includes(":6543") || /[?&]pgbouncer=true/i.test(url);
}

function isTransientPostgresError(err) {
  const c = err?.code;
  if (typeof c !== "string") return false;
  if (c === "ECONNRESET" || c === "EPIPE" || c === "ETIMEDOUT") return true;
  if (c === "CONNECTION_DESTROYED" || c === "CONNECTION_ENDED") return true;
  if (c.length === 5 && c.startsWith("08")) return true;
  return false;
}

const sql = postgres(databaseUrl, {
  max: 1,
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? false : "require",
  max_lifetime: 0,
  idle_timeout: 0,
  connect_timeout: 60,
  prepare: !isPgbouncerUrl(databaseUrl),
  connection: { application_name: "mongo-to-pg-etl-collections" },
});

async function loadExistingMongoIds(collectionKey) {
  const ids = new Set();
  const pageSize = 50_000;
  let last = "";
  while (true) {
    const rows =
      last === ""
        ? await sql`SELECT mongo_id FROM app_documents WHERE collection = ${collectionKey} ORDER BY mongo_id LIMIT ${pageSize}`
        : await sql`SELECT mongo_id FROM app_documents WHERE collection = ${collectionKey} AND mongo_id > ${last} ORDER BY mongo_id LIMIT ${pageSize}`;
    if (!rows.length) break;
    for (const row of rows) ids.add(row.mongo_id);
    last = rows[rows.length - 1].mongo_id;
    if (rows.length < pageSize) break;
  }
  return ids;
}

async function upsertDocument(collectionKey, mongoId, body) {
  let attempt = 0;
  const maxAttempts = 10;
  while (true) {
    attempt++;
    try {
      await sql`
        INSERT INTO app_documents (collection, mongo_id, body, updated_at)
        VALUES (${collectionKey}, ${mongoId}, ${sql.json(body)}, now())
        ON CONFLICT (collection, mongo_id) DO UPDATE SET body = EXCLUDED.body, updated_at = now()
      `;
      return;
    } catch (err) {
      if (attempt >= maxAttempts || !isTransientPostgresError(err)) throw err;
      const delayMs = Math.min(30_000, 400 * 2 ** (attempt - 1));
      console.warn(
        `  Postgres transient (${collectionKey} ${mongoId}): ${err.code || err.message} — retry ${attempt}/${maxAttempts} in ${delayMs}ms`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

const mongoClient = new MongoClient(mongoUri);
await mongoClient.connect();
try {
  const db = mongoClient.db();
  for (const name of collections) {
    const coll = db.collection(name);
    const collectionKey = name;
    console.log(`Copying ${collectionKey} (${incremental ? "incremental" : "full"}) …`);
    let existing = null;
    if (incremental) {
      existing = await loadExistingMongoIds(collectionKey);
      console.log(`  ${collectionKey}: ${existing.size} row(s) already in PG`);
    }
    const cursor = coll.find({}, { batchSize: 500 });
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
        continue;
      }
      let body;
      try {
        body = serializeDoc(doc);
      } catch (err) {
        console.error(`  serialize failed (${collectionKey} ${mongoId}):`, err?.message ?? err);
        throw err;
      }
      await upsertDocument(collectionKey, mongoId, body);
      upserted++;
      if (upserted % 1000 === 0) console.log(`  ${collectionKey}: ${upserted} upserted (${skipped} skipped)`);
    }
    console.log(`  ${collectionKey}: done (scanned ${scanned}, ${upserted} upserted, ${skipped} skipped)`);
  }
} finally {
  await mongoClient.close();
  await sql.end({ timeout: 10 });
}
