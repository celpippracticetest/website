#!/usr/bin/env node
/**
 * Report top statements from pg_stat_statements and optionally EXPLAIN a query text.
 *
 * Usage:
 *   node tooling/pg-slow-queries.mjs
 *   node tooling/pg-slow-queries.mjs --explain "SELECT ..." --params "uuid-here"
 *
 * Requires DATABASE_URL (loads .env.local / .env from repo root).
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const explainIdx = process.argv.indexOf("--explain");
const explainSql =
  explainIdx >= 0 ? process.argv[explainIdx + 1]?.trim() : null;
const paramsIdx = process.argv.indexOf("--params");
const explainParams =
  paramsIdx >= 0 ? process.argv.slice(paramsIdx + 1).filter((a) => !a.startsWith("--")) : [];

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: !url.includes("localhost") && !url.includes("127.0.0.1") ? "require" : false,
});

try {
  if (explainSql) {
    const plan = await sql.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${explainSql}`,
      explainParams
    );
    console.log("\n--- EXPLAIN (ANALYZE, BUFFERS) ---\n");
    for (const row of plan) {
      console.log(row["QUERY PLAN"] ?? row);
    }
    process.exit(0);
  }

  const ext = await sql`
    SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'
  `;
  if (ext.length === 0) {
    console.error(
      "pg_stat_statements is not installed. Enable it in Supabase Dashboard → Database → Extensions."
    );
    process.exit(1);
  }

  const rows = await sql`
    SELECT
      calls,
      round(total_exec_time::numeric, 2) AS total_ms,
      round(mean_exec_time::numeric, 2) AS mean_ms,
      round(max_exec_time::numeric, 2) AS max_ms,
      rows,
      left(regexp_replace(query, E'\\s+', ' ', 'g'), 220) AS query_sample
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND userid = (SELECT usesysid FROM pg_user WHERE usename = current_user)
      AND query NOT LIKE '%pg_stat_statements%'
    ORDER BY total_exec_time DESC
    LIMIT 25
  `;

  console.log("Top 25 statements by total_exec_time (current DB + role):\n");
  console.table(rows);

  const outlier = await sql`
    SELECT
      calls,
      round(mean_exec_time::numeric, 2) AS mean_ms,
      round(max_exec_time::numeric, 2) AS max_ms,
      left(regexp_replace(query, E'\\s+', ' ', 'g'), 220) AS query_sample
    FROM pg_stat_statements
    WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      AND userid = (SELECT usesysid FROM pg_user WHERE usename = current_user)
      AND calls >= 10
      AND max_exec_time > mean_exec_time * 5
      AND query NOT LIKE '%pg_stat_statements%'
    ORDER BY max_exec_time DESC
    LIMIT 15
  `;

  console.log("\nPlan instability candidates (max >> mean, calls >= 10):\n");
  console.table(outlier);
} finally {
  await sql.end({ timeout: 5 });
}
