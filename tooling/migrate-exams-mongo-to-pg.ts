/**
 * Copy `exams` and `exam-parts` from MongoDB into Postgres `app_documents`.
 * For the full catalog, run `npm run migrate:mongo:app-documents` (see `migrate-mongo-collections-to-pg.ts`).
 */

import "./bootstrap-website-env";
import {
  printPostgresCollectionCounts,
  syncMongoCollectionsToPg,
} from "./mongo-pg-sync-shared";

const LOGICAL = ["exams", "exam-parts"] as const;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let only: (typeof LOGICAL)[number] | null = null;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    if (a === "--only=exams") only = "exams";
    if (a === "--only=exam-parts") only = "exam-parts";
  }
  return { dryRun, only };
}

async function main() {
  const { dryRun, only } = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri && !dryRun) {
    console.error("MONGODB_URI is required (set in .env) unless you only inspect with --dry-run and no source.");
    process.exit(1);
  }

  const targets = only ? [only] : [...LOGICAL];

  if (!mongoUri) {
    console.log("No MONGODB_URI; printing Postgres counts only.");
    await printPostgresCollectionCounts(targets);
    return;
  }

  const { totalIns, totalUpd } = await syncMongoCollectionsToPg(targets, {
    dryRun,
    onDocError: "throw",
  });
  console.log(
    `\nSummary: ${dryRun ? `dry-run would_insert=${totalIns} would_update=${totalUpd}` : `inserted=${totalIns} updated=${totalUpd}`}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
