/**
 * Lists `app_documents.collection` row counts (top 50). Requires DATABASE_URL.
 * Loads `.env` then `.env.local` from the website root (same idea as Next.js).
 *
 * Usage: npm run pg:documents:summary
 *    or: node tooling/pg-app-documents-summary.mjs
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error(
    "DATABASE_URL is missing. Add it to .env or .env.local in the website root, or export it in the shell."
  );
  process.exit(1);
}

const useSsl = !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
const sql = postgres(databaseUrl, { max: 1, ssl: useSsl ? "require" : false });

const rows = await sql`
  SELECT collection, COUNT(*)::int AS rows
  FROM app_documents
  GROUP BY collection
  ORDER BY rows DESC
  LIMIT 50
`;
console.table(rows);

const keys = new Set(rows.map((r) => r.collection));
const hasTasks = ["tasks", "prod.tasks"].some((k) => keys.has(k));
const hasPractices = ["practices", "prod.practices"].some((k) => keys.has(k));
if (!hasTasks || !hasPractices) {
  console.log(
    "\nPractice overview and /api/tasks need `tasks` and `practices` (or `prod.*`). None found in this DB."
  );
  console.log(
    "Copy from Mongo: set MONGODB_URI and DATABASE_URL, then run: npm run etl:mongo-to-pg"
  );
  console.log(
    "If those collections are in Mongo database named `prod`, set MONGODB_SECONDARY_DB=prod for the ETL run."
  );
}

await sql.end({ timeout: 5 });
