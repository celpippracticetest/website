/**
 * Run a .sql file against DATABASE_URL (from .env or env).
 * Usage: node tooling/run-sql-migration.mjs [path/to/file.sql]
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadDatabaseUrlFromDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    let v = line.slice("DATABASE_URL=".length).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v || null;
  }
  return null;
}

const url = process.env.DATABASE_URL || loadDatabaseUrlFromDotEnv();
if (!url) {
  console.error("DATABASE_URL is not set and not found in .env");
  process.exit(1);
}
if (url.includes("YOUR_DATABASE_PASSWORD") || url.includes("[YOUR-PASSWORD]")) {
  console.error(
    "DATABASE_URL still contains a placeholder. Set your real Supabase DB password in .env."
  );
  process.exit(1);
}

const rel = process.argv[2] || "supabase/migrations/20250506120000_app_documents.sql";
const file = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
const sqlText = fs.readFileSync(file, "utf8");

const useSsl =
  !url.includes("localhost") && !url.includes("127.0.0.1");
const pg = postgres(url, { max: 1, ssl: useSsl ? "require" : false });
try {
  await pg.unsafe(sqlText);
  console.log("Migration applied:", rel);
} finally {
  await pg.end({ timeout: 10 });
}
