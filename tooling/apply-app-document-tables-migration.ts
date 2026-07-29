/**
 * Apply dedicated document tables migration.
 * Usage: npm run db:migrate:app-doc-tables
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";

async function main() {
  const path = join(
    process.cwd(),
    "supabase/migrations/20260729130000_create_dedicated_document_tables.sql"
  );
  const sqlText = readFileSync(path, "utf8");
  const sql = getSql();
  try {
    await sql.unsafe(sqlText);
    console.log("Applied dedicated document tables migration:", path);
  } finally {
    await closeSql();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
