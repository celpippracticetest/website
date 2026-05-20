#!/usr/bin/env node
/**
 * Tail-latency analysis for: SELECT mongo_id, body FROM app_documents WHERE collection = $1
 *
 *   node tooling/pg-tail-latency-app-documents.mjs
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

const BASE = `SELECT mongo_id, body FROM app_documents WHERE collection = $1`;

const VARIANTS = [
  ["baseline (no ORDER BY)", BASE],
  [
    "ORDER BY mongo_id (pkey scan)",
    `SELECT mongo_id, body FROM app_documents WHERE collection = $1 ORDER BY mongo_id`,
  ],
  [
    "LIMIT 50",
    `SELECT mongo_id, body FROM app_documents WHERE collection = $1 ORDER BY mongo_id LIMIT 50`,
  ],
];

async function timedExplain(label, queryText, param) {
  const t0 = performance.now();
  const plan = await sql.unsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${queryText}`, [
    param,
  ]);
  const ms = performance.now() - t0;
  console.log(`\n--- ${label} | collection=${param} | wall ${ms.toFixed(1)}ms ---`);
  for (const row of plan) {
    console.log(row["QUERY PLAN"]);
  }
}

async function partitionStats(collection) {
  const [row] = await sql`
    SELECT
      COUNT(*)::int AS rows,
      pg_size_pretty(SUM(pg_column_size(body))::bigint) AS body_size,
      pg_size_pretty(pg_relation_size('app_documents'::regclass)) AS table_size
    FROM app_documents
    WHERE collection = ${collection}
  `;
  return row;
}

try {
  const stmt = await sql`
    SELECT
      calls,
      round(mean_exec_time::numeric, 2) AS mean_ms,
      round(stddev_exec_time::numeric, 2) AS stddev_ms,
      round(max_exec_time::numeric, 2) AS max_ms,
      round(min_exec_time::numeric, 2) AS min_ms,
      rows,
      round((100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric, 2) AS cache_hit_pct
    FROM pg_stat_statements
    WHERE query ILIKE '%FROM app_documents%'
      AND query ILIKE '%collection%'
      AND query NOT ILIKE '%COUNT%'
      AND query NOT ILIKE '%pg_stat%'
    ORDER BY max_exec_time DESC
    LIMIT 5
  `;
  console.log("pg_stat_statements — partition scan variants (top by max_exec_time):\n");
  console.table(stmt);

  const sizes = await sql`
    SELECT collection, COUNT(*)::int AS row_count
    FROM app_documents
    GROUP BY collection
    HAVING COUNT(*) BETWEEN 1000 AND 50000
    ORDER BY row_count DESC
    LIMIT 8
  `;
  const tiny = await sql`
    SELECT collection, COUNT(*)::int AS row_count
    FROM app_documents
    GROUP BY collection
    HAVING COUNT(*) < 500
    ORDER BY row_count DESC
    LIMIT 3
  `;
  const huge = await sql`
    SELECT collection, COUNT(*)::int AS row_count
    FROM app_documents
    GROUP BY collection
    ORDER BY row_count DESC
    LIMIT 2
  `;

  const samples = [
    ...huge.map((r) => r.collection),
    ...sizes.slice(0, 2).map((r) => r.collection),
    ...tiny.map((r) => r.collection),
  ];
  const unique = [...new Set(samples)];

  console.log("\nParameter sensitivity sample sets:", unique.join(", "));

  for (const coll of unique) {
    const stats = await partitionStats(coll);
    console.log(
      `\n######## ${coll}: ${stats.rows} rows, body ${stats.body_size}, table ${stats.table_size} ########`
    );
    for (const [label, q] of VARIANTS) {
      await timedExplain(label, q, coll);
    }
  }

  console.log("\n=== Wait events (database-level, pg_stat_database) ===\n");
  const waits = await sql`
    SELECT
      datname,
      blk_read_time,
      blk_write_time,
      conflicts,
      deadlocks,
      temp_files,
      temp_bytes
    FROM pg_stat_database
    WHERE datname = current_database()
  `;
  console.table(waits);

  console.log("\n=== Current lock holders (non-granted on app_documents) ===\n");
  const locks = await sql`
    SELECT
      l.mode,
      l.granted,
      a.state,
      a.wait_event_type,
      a.wait_event,
      left(a.query, 120) AS query_snippet
    FROM pg_locks l
    JOIN pg_stat_activity a ON a.pid = l.pid
    JOIN pg_class c ON c.oid = l.relation
    WHERE c.relname = 'app_documents'
      AND a.datname = current_database()
    LIMIT 20
  `;
  if (locks.length === 0) {
    console.log("(none right now — run during a spike for live signal)");
  } else {
    console.table(locks);
  }

  console.log("\n=== Active / waiting backends (app_documents queries) ===\n");
  const activity = await sql`
    SELECT
      pid,
      state,
      wait_event_type,
      wait_event,
      round(extract(epoch FROM (now() - query_start))::numeric, 2) AS query_age_s,
      left(query, 150) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND query ILIKE '%app_documents%'
      AND pid <> pg_backend_pid()
    LIMIT 15
  `;
  if (activity.length === 0) {
    console.log("(none right now)");
  } else {
    console.table(activity);
  }
} finally {
  await sql.end({ timeout: 5 });
}
