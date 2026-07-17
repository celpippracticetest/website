import postgres from "postgres";
import { readFileSync } from "fs";

function loadEnv(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([^#=\s]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv(".env");
loadEnv(".env.local");

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: "require",
  max: 1,
});

await sql.begin(async (tx) => {
  await tx`
    DROP INDEX IF EXISTS public.answers_uq_practice
  `;

  // Listening/reading keep one row when attempt_key is empty.
  // Writing/speaking practice history uses unique attempt_key values.
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS answers_uq_practice_attempt
    ON public.answers (user_id, practice_id, attempt_key)
    WHERE practice_id IS NOT NULL
  `;
});

const indexes = await sql`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'answers'
    AND schemaname = 'public'
    AND indexname LIKE 'answers_uq_practice%'
  ORDER BY indexname
`;

console.log(JSON.stringify(indexes, null, 2));
await sql.end();
