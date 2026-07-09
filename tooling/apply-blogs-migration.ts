/**
 * Apply supabase/migrations/*.sql to DATABASE_URL (idempotent DDL only).
 *
 * Usage: npm run db:migrate:blogs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";

async function main() {
  const path = join(process.cwd(), "supabase/migrations/20260618120000_create_blogs_table.sql");
  const sqlText = readFileSync(path, "utf8");
  const sql = getSql();
  try {
    await sql.unsafe(sqlText);
    console.log("Applied blogs migration:", path);
  } finally {
    await closeSql();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
