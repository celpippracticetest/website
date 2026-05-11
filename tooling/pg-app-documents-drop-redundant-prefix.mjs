/**
 * Drops redundant `prod.<name>` rows from `app_documents` whenever the unprefixed
 * partition (`<name>`) already has rows. The `MONGODB_SECONDARY_DB=prod` flag used to
 * mirror the same Mongo DB twice, which produced these duplicates. After clearing them
 * the auto-probe in `pgCollection.ts` resolves cleanly to the unprefixed partition.
 *
 * Set `DRY_RUN=0` to actually delete (default just prints the plan).
 *
 * Usage: DRY_RUN=0 node tooling/pg-app-documents-drop-redundant-prefix.mjs
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const dryRun = String(process.env.DRY_RUN ?? "1").trim() !== "0";
const useSsl = !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
const sql = postgres(databaseUrl, { max: 1, ssl: useSsl ? "require" : false });

const rows = await sql`
  SELECT collection, COUNT(*)::int AS rows
  FROM app_documents
  WHERE collection LIKE 'prod.%'
  GROUP BY collection
  ORDER BY collection
`;

if (rows.length === 0) {
  console.log("No `prod.*` rows in app_documents — nothing to clean up.");
  await sql.end({ timeout: 5 });
  process.exit(0);
}

const plan = [];
for (const row of rows) {
  const bare = row.collection.slice("prod.".length);
  const [{ rows: bareCount }] = await sql`
    SELECT COUNT(*)::int AS rows FROM app_documents WHERE collection = ${bare}
  `;
  plan.push({
    prefixed: row.collection,
    prefixedRows: row.rows,
    unprefixed: bare,
    unprefixedRows: bareCount,
    dropPrefixed: bareCount > 0,
  });
}

console.table(plan);

const targets = plan.filter((p) => p.dropPrefixed);
if (targets.length === 0) {
  console.log(
    "Every `prod.*` partition has an empty unprefixed sibling. Nothing safe to drop — re-run ETL first if you want to consolidate."
  );
  await sql.end({ timeout: 5 });
  process.exit(0);
}

if (dryRun) {
  console.log(
    `\nDRY_RUN=1 (default). Would delete ${targets.reduce((n, p) => n + p.prefixedRows, 0)} rows across ${targets.length} partitions. Re-run with DRY_RUN=0 to apply.`
  );
  await sql.end({ timeout: 5 });
  process.exit(0);
}

let totalDeleted = 0;
for (const t of targets) {
  const result = await sql`
    DELETE FROM app_documents WHERE collection = ${t.prefixed}
  `;
  console.log(`  deleted ${result.count} rows from "${t.prefixed}" (kept ${t.unprefixedRows} in "${t.unprefixed}")`);
  totalDeleted += result.count;
}
console.log(`\nDone. Removed ${totalDeleted} redundant rows.`);

await sql.end({ timeout: 5 });
