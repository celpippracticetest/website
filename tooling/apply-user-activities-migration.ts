/**
 * Apply supabase/migrations/20260729120000_create_user_activities_tables.sql
 *
 * Usage: npm run db:migrate:user-activities
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";

async function main() {
  const path = join(
    process.cwd(),
    "supabase/migrations/20260729120000_create_user_activities_tables.sql"
  );
  const sqlText = readFileSync(path, "utf8");
  const sql = getSql();
  try {
    await sql.unsafe(sqlText);
    console.log("Applied user_activities migration:", path);
  } finally {
    await closeSql();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
