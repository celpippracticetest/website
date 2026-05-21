import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env", ".env.local"]) {
  try {
    for (const line of readFileSync(join(root, file), "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        process.env[m[1].trim()] = v;
      }
    }
  } catch {
    // optional
  }
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const cols = await sql`
  SELECT column_name, data_type, udt_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_profiles'
    AND column_name IN ('supabase_auth_user_id', 'legacy_clerk_user_id', 'id')
  ORDER BY column_name
`;
console.log(cols);

const uid = "96d57234-0db2-45ef-98c0-bec8f3ee78cb";
try {
  await sql.unsafe(
    `SELECT app_document_mongo_id FROM public.user_profiles WHERE supabase_auth_user_id = $1::uuid LIMIT 1`,
    [uid]
  );
  console.log("uuid cast query: ok");
} catch (e) {
  console.log("uuid cast query:", e.message);
}
try {
  await sql.unsafe(
    `SELECT app_document_mongo_id FROM public.user_profiles WHERE supabase_auth_user_id::text = $1 LIMIT 1`,
    [uid]
  );
  console.log("text cast query: ok");
} catch (e) {
  console.log("text cast query:", e.message);
}

await sql.end();
