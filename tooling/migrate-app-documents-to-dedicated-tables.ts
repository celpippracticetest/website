/**
 * Copy app_documents partitions into dedicated doc_* tables.
 *
 * Usage:
 *   npm run migrate:app-documents:to-tables -- --dry-run
 *   npm run migrate:app-documents:to-tables
 *   npm run migrate:app-documents:to-tables -- --collections=plans,checkouts
 */
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";
import { resolveAppDocumentsPartitionKey } from "@/lib/pg/pgCollection";
import {
  DEDICATED_DOCUMENT_COLLECTIONS,
  dedicatedDocumentTableName,
} from "@/lib/pg/dedicatedDocumentTables";

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run");
  const flag = argv.find((a) => a.startsWith("--collections="));
  const collections = flag
    ? flag
        .slice("--collections=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [...DEDICATED_DOCUMENT_COLLECTIONS];
  return { dryRun, collections };
}

function assertSafeTable(table: string): string {
  if (!/^doc_[a-z0-9_]+$/.test(table)) {
    throw new Error(`Unsafe dedicated table name: ${table}`);
  }
  return table;
}

async function main() {
  const { dryRun, collections } = parseArgs(process.argv.slice(2));
  const sql = getSql();
  try {
    for (const logical of collections) {
      const table = assertSafeTable(dedicatedDocumentTableName(logical));
      const key = await resolveAppDocumentsPartitionKey(sql, logical);
      const [{ c }] = await sql<{ c: number }[]>`
        SELECT COUNT(*)::int AS c FROM app_documents WHERE collection = ${key}
      `;
      console.log(`${logical} → ${table}: source=${c} (partition=${key})`);
      if (dryRun || c === 0) continue;

      await sql.unsafe(
        `
        INSERT INTO public.${table} (mongo_id, body, updated_at)
        SELECT mongo_id, body, COALESCE(updated_at, now())
        FROM app_documents
        WHERE collection = $1
        ON CONFLICT (mongo_id) DO UPDATE SET
          body = EXCLUDED.body,
          updated_at = EXCLUDED.updated_at
        `,
        [key]
      );
      const [{ c: after }] = await sql.unsafe(
        `SELECT COUNT(*)::int AS c FROM public.${table}`
      ) as { c: number }[];
      console.log(`  upserted; ${table} now has ${after} rows`);
    }
    console.log("Done.");
  } finally {
    await closeSql();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
