#!/usr/bin/env node
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: !process.env.DATABASE_URL.includes("localhost") ? "require" : false,
});

const target = Number(process.argv[2] || 1282);

const near = await sql`
  SELECT collection, COUNT(*)::int AS c
  FROM app_documents
  GROUP BY collection
  ORDER BY ABS(COUNT(*) - ${target})
  LIMIT 5
`;
console.log(`Collections nearest ${target} rows:\n`);
console.table(near);

const coll = near[0]?.collection;
if (!coll) {
  await sql.end();
  process.exit(0);
}

const queries = [
  [
    "full partition (ORDER BY mongo_id) — app default",
    `SELECT mongo_id, body FROM app_documents WHERE collection = $1 ORDER BY mongo_id`,
  ],
  [
    "mongo_id only (index-only candidate)",
    `SELECT mongo_id FROM app_documents WHERE collection = $1 ORDER BY mongo_id`,
  ],
  [
    "COUNT only",
    `SELECT COUNT(*)::int FROM app_documents WHERE collection = $1`,
  ],
];

for (const [label, q] of queries) {
  console.log(`\n=== ${coll} (${near[0].c} rows) | ${label} ===`);
  const plan = await sql.unsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${q}`, [coll]);
  for (const row of plan) console.log(row["QUERY PLAN"]);
}

const idx = await sql`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'app_documents'
    AND (indexdef ILIKE '%collection%' OR indexname = 'app_documents_pkey')
  ORDER BY indexname
`;
console.log("\n=== Indexes on collection / PK ===\n");
console.table(idx);

await sql.end({ timeout: 5 });
