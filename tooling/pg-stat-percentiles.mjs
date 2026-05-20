#!/usr/bin/env node
/**
 * Top queries by calls with mean/max and estimated p95 from pg_stat_statements moments.
 * (True percentiles need pg_stat_monitor or log sampling.)
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: !process.env.DATABASE_URL.includes("localhost") ? "require" : false,
});

function estP95(mean, stddev) {
  if (mean == null || stddev == null) return null;
  const m = Number(mean);
  const s = Number(stddev);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return Math.round((m + 1.645 * s) * 100) / 100;
}

const rows = await sql`
  SELECT
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    round(max_exec_time::numeric, 2) AS max_ms,
    round(min_exec_time::numeric, 2) AS min_ms,
    rows AS rows_total,
    round((rows::numeric / NULLIF(calls, 0))::numeric, 0) AS rows_per_call,
    round(
      (100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0))::numeric,
      2
    ) AS cache_hit_pct,
    left(regexp_replace(query, E'\\s+', ' ', 'g'), 100) AS query_sample
  FROM pg_stat_statements
  WHERE query ILIKE '%FROM app_documents%'
    AND query ILIKE '%collection%'
    AND query ILIKE '%mongo_id%'
    AND query NOT ILIKE '%COUNT%'
    AND query NOT ILIKE '%pg_stat%'
  ORDER BY calls DESC
  LIMIT 10
`;

console.log("Partition read paths (by calls):\n");
for (const r of rows) {
  const p95 = estP95(r.mean_ms, r.stddev_ms);
  console.log({
    calls: r.calls,
    mean_ms: r.mean_ms,
    est_p95_ms: p95,
    max_ms: r.max_ms,
    min_ms: r.min_ms,
    rows_per_call: r.rows_per_call,
    cache_hit_pct: r.cache_hit_pct,
    query: r.query_sample,
  });
}

await sql.end({ timeout: 5 });
