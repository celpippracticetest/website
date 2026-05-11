/**
 * Lists MongoDB databases/collections used for migration planning.
 * Usage: node tooling/mongo-inventory.mjs
 * Requires MONGODB_URI (and optionally MONGODB_INVENTORY_SECONDARY=prod for db("prod")).
 * Loads `.env` / `.env.local` from the website root when run via npm.
 */
import { MongoClient } from "mongodb";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI");
  process.exit(1);
}

async function inventoryDb(client, dbName, label) {
  const db = dbName ? client.db(dbName) : client.db();
  const name = dbName || "(default from URI)";
  console.log(`\n=== ${label}: ${name} ===`);
  const cols = await db.listCollections().toArray();
  cols.sort((a, b) => a.name.localeCompare(b.name));
  for (const c of cols) {
    const coll = db.collection(c.name);
    const count = await coll.estimatedDocumentCount();
    const indexes = await coll.indexes();
    const idx = indexes.map((i) => i.name).join(", ");
    console.log(`${c.name}\tcount~${count}\tindexes: ${idx}`);
  }
}

const client = new MongoClient(uri);
await client.connect();
try {
  await inventoryDb(client, null, "Primary");
  const secondary = process.env.MONGODB_INVENTORY_SECONDARY;
  if (secondary) {
    await inventoryDb(client, secondary, "Secondary");
  }
} finally {
  await client.close();
}
