const fs = require("fs");
const path = require("path");
const postgres = require("postgres");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const USER_ID = "f7948895-fb4a-41a1-8bf3-d94563c37580";

  // Best-effort: update users document body if present
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema='public' and table_name in ('doc_users', 'users')
  `;
  console.log("tables", tables);

  if (tables.some((t) => t.table_name === "doc_users")) {
    const updated = await sql`
      UPDATE public.doc_users
      SET
        body = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(body, '{plan}', '"free"'),
                '{planType}', '""'
              ),
              '{publicMetadata,plan}', '"free"'
            ),
            '{publicMetadata,planType}', '""'
          ),
          '{publicMetadata,planCancelled}', 'false'::jsonb
        ),
        updated_at = now()
      WHERE body->>'supabaseUserId' = ${USER_ID}
         OR body->>'clerkUserId' = ${USER_ID}
         OR mongo_id = ${USER_ID}
         OR lower(body->>'email') = 'aasthamaheta00000@gmail.com'
      RETURNING mongo_id, body->>'plan' AS plan
    `;
    console.log("doc_users updated", updated);
  }

  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
