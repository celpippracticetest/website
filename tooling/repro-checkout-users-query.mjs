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

const uid = "96d57234-0db2-45ef-98c0-bec8f3ee78cb";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const broken = `(
  (supabase_auth_user_id = $1::uuid OR legacy_body->>'supabaseUserId' = $1 OR legacy_body->>'sub' = $1)
  OR (supabase_auth_user_id = $2::uuid OR legacy_body->>'supabaseUserId' = $2 OR legacy_body->>'sub' = $2)
  OR (legacy_clerk_user_id = $3 OR legacy_body->>'clerkUserId' = $3)
)`;

/** Matches usersFilterToSql: indexed columns only (no legacy_body OR). */
const fixed = `(
  (supabase_auth_user_id = $1::uuid)
  OR (supabase_auth_user_id = $2::uuid)
  OR (legacy_clerk_user_id = $3)
)`;

for (const [name, clause, params] of [
  ["broken", broken, [uid, uid, uid]],
  ["fixed", fixed, [uid, uid, uid]],
]) {
  try {
    await sql.unsafe(
      `SELECT app_document_mongo_id FROM public.user_profiles WHERE ${clause} LIMIT 1`,
      params
    );
    console.log(name, "ok");
  } catch (e) {
    console.log(name, e.message);
  }
}

await sql.end();
