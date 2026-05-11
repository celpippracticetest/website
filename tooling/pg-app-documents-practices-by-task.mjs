/**
 * Diagnose `/api/practices?type=…&taskId=…` returning 0.
 *
 * Pulls every practice from `app_documents`, normalises `body->>'taskId'` (which can be a
 * raw 24-char hex string OR a JSON `{"$oid":"…"}` object), and groups by (taskId, type).
 * Run with no args to dump the whole index, or pass one or more 24-char hex task ids
 * (and an optional `--type=LISTENING` filter) to focus on a specific task.
 *
 * Usage:
 *   node tooling/pg-app-documents-practices-by-task.mjs
 *   node tooling/pg-app-documents-practices-by-task.mjs 67ebefda187829d27daac3c4
 *   node tooling/pg-app-documents-practices-by-task.mjs --type=LISTENING 67ebefda187829d27daac3c4
 */
import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const args = process.argv.slice(2);
const typeArg = args.find((a) => a.startsWith("--type="))?.slice("--type=".length).toUpperCase();
const requestedTasks = args
  .filter((a) => /^[a-f0-9]{24}$/i.test(a))
  .map((a) => a.toLowerCase());

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

const rows = await sql`
  SELECT
    body ->> 'taskId' AS task_id_str,
    body -> 'taskId' AS task_id_obj,
    UPPER(COALESCE(body ->> 'type', '')) AS type,
    COUNT(*)::int AS practices
  FROM app_documents
  WHERE collection = 'practices'
  GROUP BY task_id_str, task_id_obj, type
`;

function normaliseTaskId(taskIdStr, taskIdObj) {
  if (typeof taskIdStr === "string" && /^[a-f0-9]{24}$/i.test(taskIdStr)) {
    return taskIdStr.toLowerCase();
  }
  if (taskIdObj && typeof taskIdObj === "object" && typeof taskIdObj.$oid === "string") {
    return taskIdObj.$oid.toLowerCase();
  }
  return null;
}

const grouped = new Map();
for (const row of rows) {
  const tid = normaliseTaskId(row.task_id_str, row.task_id_obj);
  const key = `${tid ?? "(missing)"}|${row.type}`;
  grouped.set(key, (grouped.get(key) ?? 0) + row.practices);
}

const flat = [...grouped.entries()].map(([key, practices]) => {
  const [taskId, type] = key.split("|");
  return { taskId, type, practices };
});

const filtered = flat.filter((row) => {
  if (typeArg && row.type !== typeArg) return false;
  if (requestedTasks.length > 0 && !requestedTasks.includes(row.taskId)) return false;
  return true;
});

filtered.sort((a, b) => b.practices - a.practices || a.taskId.localeCompare(b.taskId));

console.log(`practices grouped by (taskId, type)${typeArg ? ` filtered by type=${typeArg}` : ""}${requestedTasks.length ? ` for ${requestedTasks.length} task id(s)` : ""}:`);
console.table(filtered.slice(0, 50));

if (requestedTasks.length > 0) {
  for (const tid of requestedTasks) {
    const total = flat.filter((r) => r.taskId === tid).reduce((n, r) => n + r.practices, 0);
    console.log(`  total practices for task ${tid}: ${total}`);
  }
}

await sql.end();
