/**
 * Inspect the distinct `body->>'type'` values per collection.
 * Helps verify it is safe to stop blanket-upper-casing `type` in `rowToDocument`.
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

const targets = [
  "tasks",
  "practices",
  "answers",
  "leagues",
  "league_groups",
  "league_seasons",
  "useractivities",
  "checkouts",
  "users",
  "stripe_subscriptions",
];

for (const collection of targets) {
  const rows = await sql`
    SELECT body ->> 'type' AS type, COUNT(*)::int AS rows
    FROM app_documents
    WHERE collection = ${collection}
    GROUP BY type
    ORDER BY rows DESC
    LIMIT 20
  `;
  if (rows.length === 0) {
    console.log(`\n${collection}: (no rows)`);
    continue;
  }
  console.log(`\n${collection}:`);
  console.table(rows);
}

await sql.end({ timeout: 5 });
