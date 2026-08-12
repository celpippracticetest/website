require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const url = process.env.DATABASE_URL || "";
// Redact password for logging
console.log("DATABASE_URL role hint:", url.replace(/:([^:@/]+)@/, ":***@").slice(0, 120));

const sql = postgres(url, { max: 1, ssl: "require" });

(async () => {
  const who = await sql`SELECT current_user, session_user, current_setting('role') AS role`;
  console.log("whoami:", who[0]);

  const bypass = await sql`
    SELECT rolname, rolsuper, rolbypassrls
    FROM pg_roles
    WHERE rolname = current_user
  `;
  console.log("role attrs:", bypass[0]);

  // What can anon/authenticated see?
  const roleGrants = await sql`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'user_activities'
      AND grantee IN ('anon', 'authenticated', 'authenticator', 'dashboard_user', 'postgres', 'service_role')
  `;
  console.log("key role grants:", roleGrants);

  // All policies
  const policies = await sql`
    SELECT * FROM pg_policies WHERE tablename = 'user_activities'
  `;
  console.log("pg_policies:", policies);

  // Simulate as authenticated if possible
  try {
    await sql`BEGIN`;
    await sql`SET LOCAL ROLE authenticated`;
    const asAuth = await sql`SELECT count(*)::int AS c FROM public.user_activities`;
    console.log("as authenticated count:", asAuth[0]);
    await sql`ROLLBACK`;
  } catch (e) {
    try { await sql`ROLLBACK`; } catch {}
    console.log("as authenticated failed:", e.message);
  }

  try {
    await sql`BEGIN`;
    await sql`SET LOCAL ROLE anon`;
    const asAnon = await sql`SELECT count(*)::int AS c FROM public.user_activities`;
    console.log("as anon count:", asAnon[0]);
    await sql`ROLLBACK`;
  } catch (e) {
    try { await sql`ROLLBACK`; } catch {}
    console.log("as anon failed:", e.message);
  }

  // Check if service_role can be set
  try {
    await sql`BEGIN`;
    await sql`SET LOCAL ROLE service_role`;
    const asSvc = await sql`SELECT count(*)::int AS c FROM public.user_activities WHERE user_id = '1705e47c-9d3b-4575-9584-3b7ef2240ea3'`;
    console.log("as service_role count for oliver:", asSvc[0]);
    await sql`ROLLBACK`;
  } catch (e) {
    try { await sql`ROLLBACK`; } catch {}
    console.log("as service_role failed:", e.message);
  }

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});
