/**
 * Shared MongoDB → Postgres `app_documents` upsert helpers for tooling scripts.
 * Callers must `import "./bootstrap-website-env"` first (loads `.env`).
 */

import dns from "node:dns";
import { createRequire } from "node:module";
import { MongoClient, type Document } from "mongodb";
import { EJSON, ObjectId } from "bson";
import { getSql, closeSql } from "@/lib/pg/pool";
import { prepareInsertDocument } from "@/lib/pg/document";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";

/** `mongodb@6` pins nested `bson@6`; the app uses `bson@7` for `app_documents`. */
let bson6Module: typeof import("bson") | undefined;
export function bson6ForMongoDriver(): typeof import("bson") {
  if (bson6Module) return bson6Module;
  const require = createRequire(import.meta.url);
  bson6Module = require(require.resolve("bson", { paths: [require.resolve("mongodb")] })) as typeof import("bson");
  return bson6Module;
}

export function mongoDriverDocToBson7(doc: Document): Document {
  const json = bson6ForMongoDriver().EJSON.stringify(doc, { relaxed: true });
  return EJSON.parse(json, { relaxed: true }) as Document;
}

export function applyOptionalMongoDnsServers(): void {
  const raw = process.env.MONGODB_DNS_SERVERS?.trim();
  if (!raw) return;
  const servers = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (servers.length === 0) return;
  dns.setServers(servers);
  console.log(`[mongo] Using DNS servers: ${servers.join(", ")}`);
}

export function isSrvDnsFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; syscall?: string; message?: string };
  if (e.syscall === "querySrv" && (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND" || e.code === "ETIMEOUT")) {
    return true;
  }
  const msg = typeof e.message === "string" ? e.message : "";
  return msg.includes("querySrv") && (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND"));
}

export function printMongoSrvTroubleshooting(uri: string): void {
  const usesSrv = uri.startsWith("mongodb+srv://");
  console.error(`
MongoDB connection failed${usesSrv ? " while resolving SRV records for mongodb+srv://" : ""}.

What usually fixes it:
  1) Atlas → Connect → Drivers: copy the **standard connection string** (starts with mongodb://
     and lists host:27017,…) and set MONGODB_URI to that (keep user, password, tls, replicaSet params).
  2) Or set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 in .env and retry (some VPNs/corp DNS block SRV).
  3) Try off VPN / different network if DNS is blocked.
`);
}

function bsonifyForPrepare(doc: Document): Document {
  const id = doc._id;
  if (id != null && typeof id === "object" && typeof (id as { toHexString?: () => string }).toHexString === "function") {
    const hex = (id as { toHexString: () => string }).toHexString();
    return { ...doc, _id: new ObjectId(hex) };
  }
  if (typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) {
    return { ...doc, _id: new ObjectId(id) };
  }
  return { ...doc };
}

async function rowExists(
  sql: ReturnType<typeof getSql>,
  phys: string,
  mongoId: string
): Promise<boolean> {
  const r = await sql`
    SELECT 1 AS ok FROM app_documents WHERE collection = ${phys} AND mongo_id = ${mongoId} LIMIT 1
  `;
  return r.length > 0;
}

async function upsertAppDocument(
  sql: ReturnType<typeof getSql>,
  phys: string,
  mongoId: string,
  bodySerialized: unknown,
  dryRun: boolean
): Promise<"insert" | "update"> {
  if (dryRun) {
    return (await rowExists(sql, phys, mongoId)) ? "update" : "insert";
  }
  const u = await sql`
    UPDATE app_documents
    SET body = ${bodySerialized as object}, updated_at = now()
    WHERE collection = ${phys} AND mongo_id = ${mongoId}
  `;
  if (u.count > 0) return "update";
  await sql`
    INSERT INTO app_documents (collection, mongo_id, body, updated_at)
    VALUES (${phys}, ${mongoId}, ${bodySerialized as object}, now())
  `;
  return "insert";
}

async function countPg(sql: ReturnType<typeof getSql>, phys: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS c FROM app_documents WHERE collection = ${phys}
  `;
  return rows[0]?.c ?? 0;
}

export type CollectionSyncStats = {
  logical: string;
  physical: string;
  scanned: number;
  ins: number;
  upd: number;
  skipped: number;
};

export type SyncMongoCollectionsResult = {
  totalIns: number;
  totalUpd: number;
  perCollection: CollectionSyncStats[];
};

/**
 * Upsert every document from Mongo `logical` into Postgres `app_documents` for the
 * partition returned by `resolveAppDocumentsPartitionKey` (respects `APP_DOCUMENTS_DB`).
 */
export async function syncMongoCollectionsToPg(
  logicalNames: string[],
  options: { dryRun: boolean; onDocError?: "throw" | "skip" }
): Promise<SyncMongoCollectionsResult> {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required.");
  }

  const sql = getSql();
  let mongo: MongoClient | undefined;
  let totalIns = 0;
  let totalUpd = 0;
  const perCollection: CollectionSyncStats[] = [];

  try {
    applyOptionalMongoDnsServers();
    mongo = new MongoClient(mongoUri);
    try {
      await mongo.connect();
    } catch (e) {
      if (isSrvDnsFailure(e)) printMongoSrvTroubleshooting(mongoUri);
      throw e;
    }
    const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGODB_DB?.trim();
    const mdb = dbName ? mongo.db(dbName) : mongo.db();

    for (const logical of logicalNames) {
      const phys = await resolveAppDocumentsPartitionKey(sql, logical);
      const before = await countPg(sql, phys);
      const coll = mdb.collection(logical);
      const total = await coll.estimatedDocumentCount();
      console.log(
        `\n[${logical}] Mongo estimated count=${total} → Postgres partition "${phys}" (rows before: ${before})`
      );

      const cursor = coll.find({}, { batchSize: 100 });
      let n = 0;
      let ins = 0;
      let upd = 0;
      let skipped = 0;
      for await (const row of cursor) {
        n++;
        try {
          const { mongoId, bodySerialized } = prepareInsertDocument(
            bsonifyForPrepare(mongoDriverDocToBson7(row))
          );
          const kind = await upsertAppDocument(sql, phys, mongoId, bodySerialized, options.dryRun);
          if (kind === "insert") ins++;
          if (kind === "update") upd++;
        } catch (docErr) {
          if (options.onDocError === "throw") throw docErr;
          skipped++;
          if (skipped <= 5) {
            console.warn(`  [warn] skipped document (row ${n}):`, docErr);
          }
        }
        if (n % 500 === 0) {
          process.stdout.write(`  … ${n} documents\r`);
        }
      }
      const after = options.dryRun ? before : await countPg(sql, phys);
      console.log(
        `  Done: scanned=${n} skipped=${skipped} ${options.dryRun ? "would_insert" : "inserted"}=${ins} ${options.dryRun ? "would_update" : "updated"}=${upd} pg_rows_after=${after}`
      );
      totalIns += ins;
      totalUpd += upd;
      perCollection.push({ logical, physical: phys, scanned: n, ins, upd, skipped });
    }

    return { totalIns, totalUpd, perCollection };
  } finally {
    await mongo?.close().catch(() => undefined);
    await closeSql();
  }
}

export async function printPostgresCollectionCounts(logicalNames: string[]): Promise<void> {
  const sql = getSql();
  try {
    for (const logical of logicalNames) {
      const phys = await resolveAppDocumentsPartitionKey(sql, logical);
      const c = await countPg(sql, phys);
      console.log(`  ${logical} → collection="${phys}" rows=${c}`);
    }
  } finally {
    await closeSql();
  }
}
