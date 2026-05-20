#!/usr/bin/env node
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: !process.env.DATABASE_URL.includes("localhost") ? "require" : false,
});
const rows = await sql`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'app_documents'
  ORDER BY indexname
`;
console.table(rows);
await sql.end({ timeout: 5 });
