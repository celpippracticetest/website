/**
 * One-off diagnostic for the Mongo-compat document store on Postgres.
 * Lists row counts for every distinct collection key and prints sample bodies
 * for the collections the mobile app reads (practices, tasks, exams, answers).
 *
 * Usage: node tooling/pg-app-documents-debug.mjs
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const useSsl = !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
const sql = postgres(databaseUrl, { max: 1, ssl: useSsl ? "require" : false });

const allCollections = await sql`
  SELECT collection, COUNT(*)::int AS rows
  FROM app_documents
  GROUP BY collection
  ORDER BY collection
`;

console.log("All collection keys present in app_documents:");
console.table(allCollections);

const interesting = ["practices", "prod.practices", "tasks", "prod.tasks", "exams", "prod.exams", "answers", "prod.answers"];
console.log("\nKey lookups for mobile-app reads:");
for (const key of interesting) {
  const [{ rows }] = await sql`
    SELECT COUNT(*)::int AS rows FROM app_documents WHERE collection = ${key}
  `;
  console.log(`  ${key.padEnd(20)} ${rows} rows`);
}

console.log("\nAny collection key that contains 'exam':");
const examLike = await sql`
  SELECT collection, COUNT(*)::int AS rows
  FROM app_documents
  WHERE collection ILIKE '%exam%'
  GROUP BY collection
  ORDER BY collection
`;
console.table(examLike);

console.log("\nFirst practice row body keys (un-prefixed `practices` collection):");
const samplePractice = await sql`
  SELECT mongo_id, body FROM app_documents WHERE collection = 'practices' LIMIT 1
`;
if (samplePractice.length === 0) {
  console.log("  (no rows)");
} else {
  const body = samplePractice[0].body;
  console.log("  mongo_id:", samplePractice[0].mongo_id);
  console.log("  top-level keys:", Object.keys(body).sort());
  console.log("  body.type:", body.type);
  console.log("  body.taskId:", body.taskId);
  console.log("  body.isFree:", body.isFree);
}

console.log("\nFirst task row body keys (un-prefixed `tasks` collection):");
const sampleTask = await sql`
  SELECT mongo_id, body FROM app_documents WHERE collection = 'tasks' LIMIT 1
`;
if (sampleTask.length === 0) {
  console.log("  (no rows)");
} else {
  const body = sampleTask[0].body;
  console.log("  mongo_id:", sampleTask[0].mongo_id);
  console.log("  top-level keys:", Object.keys(body).sort());
  console.log("  body.type:", body.type);
  console.log("  body.category:", body.category);
}

await sql.end({ timeout: 5 });
