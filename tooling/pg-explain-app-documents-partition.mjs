#!/usr/bin/env node
/**
 * Compare EXPLAIN (ANALYZE, BUFFERS) for app_documents partition scans (fast vs slow collections).
 *
 *   node tooling/pg-explain-app-documents-partition.mjs
 *   node tooling/pg-explain-app-documents-partition.mjs practices tasks
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: !url.includes("localhost") && !url.includes("127.0.0.1") ? "require" : false,
});

const PARTITION_SQL = `SELECT mongo_id, body FROM app_documents WHERE collection = $1`;

async function explainPartition(collection) {
  const [{ c }] = await sql`
    SELECT COUNT(*)::int AS c FROM app_documents WHERE collection = ${collection}
  `;
  const [{ bytes }] = await sql`
    SELECT COALESCE(SUM(pg_column_size(body)), 0)::bigint AS bytes
    FROM app_documents
    WHERE collection = ${collection}
  `;

  console.log(`\n========== collection: ${collection} (${c} rows, ~${(Number(bytes) / 1e6).toFixed(1)} MB body) ==========`);

  const variants = [
    ["default", PARTITION_SQL],
    [
      "order by mongo_id (pkey-friendly)",
      `SELECT mongo_id, body FROM app_documents WHERE collection = $1 ORDER BY mongo_id`,
    ],
    ["mongo_id only", `SELECT mongo_id FROM app_documents WHERE collection = $1`],
  ];

  for (const [label, text] of variants) {
    console.log(`\n--- ${label} ---`);
    const plan = await sql.unsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${text}`, [
      collection,
    ]);
    for (const row of plan) {
      console.log(row["QUERY PLAN"]);
    }
  }
}

try {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"));

  let collections = requested;
  if (collections.length === 0) {
    const sizes = await sql`
      SELECT
        collection,
        COUNT(*)::int AS row_count,
        COALESCE(SUM(pg_column_size(body)), 0)::bigint AS body_bytes
      FROM app_documents
      GROUP BY collection
      ORDER BY row_count DESC
      LIMIT 20
    `;
    console.log("Top partitions by row count:\n");
    console.table(sizes);

    if (sizes.length === 0) {
      console.log("No app_documents rows.");
      process.exit(0);
    }

    const largest = sizes[0].collection;
    const smallest = sizes[sizes.length - 1].collection;
    collections = [largest, smallest];
    if (largest !== smallest && sizes.length > 1) {
      const mid = sizes[Math.floor(sizes.length / 2)];
      if (mid && mid.collection !== largest && mid.collection !== smallest) {
        collections = [largest, mid.collection, smallest];
      }
    }
    console.log(`\nExplaining: ${collections.join(", ")} (largest / mid / smallest of top 20)`);
  }

  for (const coll of collections) {
    await explainPartition(coll);
  }
} finally {
  await sql.end({ timeout: 5 });
}
