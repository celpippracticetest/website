/**
 * Apply supabase/migrations/*.sql to DATABASE_URL (idempotent DDL only).
 *
 * Usage: npm run db:migrate:blog-cms-posts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";

async function main() {
  const path = join(
    process.cwd(),
    "supabase/migrations/20260618130000_create_blog_cms_posts_table.sql"
  );
  const sqlText = readFileSync(path, "utf8");
  const sql = getSql();
  try {
    await sql.unsafe(sqlText);
    console.log("Applied blog_cms_posts migration:", path);
  } finally {
    await closeSql();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
